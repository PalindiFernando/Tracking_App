import axios from 'axios';
import { cacheService } from '../cache/redis';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { RouteMappingService } from './routeMapping';
import { GPSIngestService } from './gpsIngest';

export interface ETARequest {
  vehicle_id: string;
  stop_id: string;
}

export interface ETAResponse {
  vehicle_id: string;
  stop_id: string;
  route_id?: string;
  eta_minutes: number;
  eta_timestamp: Date;
  confidence: 'high' | 'medium' | 'low';
  cached: boolean;
}

export class ETACalculationService {
  private static readonly GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  private static readonly DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
  private static readonly DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  private static readonly CACHE_TTL = parseInt(process.env.ETA_CACHE_TTL_SECONDS || '30');
  private static readonly SAFETY_BUFFER_MINUTES = parseInt(process.env.ETA_SAFETY_BUFFER_MINUTES || '1');

  /**
   * Calculate ETA using Google Directions API
   */
  static async calculateETA(vehicleId: string, stopId: string): Promise<ETAResponse> {
    // Check cache first
    const cacheKey = `eta:${vehicleId}:${stopId}`;
    const cached = await cacheService.get<ETAResponse>(cacheKey);
    if (cached) {
      logger.debug(`ETA cache hit for ${vehicleId} -> ${stopId}`);
      return { ...cached, cached: true };
    }

    try {
      // Get latest bus position
      const position = await GPSIngestService.getLatestPosition(vehicleId);
      if (!position) {
        throw createError(`No position found for vehicle ${vehicleId}`, 404);
      }

      // Get stop information
      const stop = await RouteMappingService.getStop(stopId);
      if (!stop) {
        throw createError(`Stop ${stopId} not found`, 404);
      }

      // Map bus to route
      const route = await RouteMappingService.mapToRoute(position.latitude, position.longitude);
      const routeId = route?.route_id;

      // Calculate ETA using Google Directions API
      const etaMinutes = await this.getETAFromGoogle(
        position.latitude,
        position.longitude,
        stop.stop_lat,
        stop.stop_lon
      );

      // Apply safety buffer
      const bufferedETA = etaMinutes + this.SAFETY_BUFFER_MINUTES;

      // Determine confidence based on data freshness
      const positionAge = (Date.now() - position.timestamp.getTime()) / 1000 / 60; // minutes
      let confidence: 'high' | 'medium' | 'low' = 'high';
      if (positionAge > 5) confidence = 'medium';
      if (positionAge > 10) confidence = 'low';

      const etaResponse: ETAResponse = {
        vehicle_id: vehicleId,
        stop_id: stopId,
        route_id: routeId,
        eta_minutes: Math.round(bufferedETA),
        eta_timestamp: new Date(Date.now() + bufferedETA * 60 * 1000),
        confidence,
        cached: false
      };

      // Cache the result
      await cacheService.set(cacheKey, etaResponse, this.CACHE_TTL);

      logger.info(`ETA calculated for ${vehicleId} -> ${stopId}: ${bufferedETA} minutes`);

      return etaResponse;
    } catch (error: any) {
      logger.error(`ETA calculation error for ${vehicleId} -> ${stopId}`, error);
      
      // Try to return cached ETA even if expired
      const expiredCache = await cacheService.get<ETAResponse>(cacheKey);
      if (expiredCache) {
        logger.warn(`Returning expired cache for ${vehicleId} -> ${stopId}`);
        return { ...expiredCache, cached: true, confidence: 'low' };
      }

      throw createError(error.message || 'Failed to calculate ETA', error.statusCode || 500);
    }
  }

  /**
   * Get ETA from Google Directions API
   */
  private static async getETAFromGoogle(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<number> {
    if (!this.GOOGLE_API_KEY) {
      throw createError('Google API key not configured', 500);
    }

    try {
      const response = await axios.get(this.DIRECTIONS_API_URL, {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: this.GOOGLE_API_KEY
        },
        timeout: 5000
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Directions API error', response.data);
        throw createError(`Google API error: ${response.data.status}`, 500);
      }

      const route = response.data.routes[0];
      if (!route || !route.legs || route.legs.length === 0) {
        throw createError('No route found', 404);
      }

      // Get duration in traffic (in seconds)
      const durationInTraffic = route.legs[0].duration_in_traffic?.value || route.legs[0].duration.value;
      const etaMinutes = durationInTraffic / 60;

      return etaMinutes;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          logger.error('Google API rate limit exceeded');
          throw createError('API rate limit exceeded', 429);
        }
        logger.error('Google API request failed', error.message);
        throw createError('Failed to get ETA from Google API', 500);
      }
      throw error;
    }
  }

  /**
   * Calculate ETAs for multiple stops (batch)
   */
  static async calculateETAsForStops(vehicleId: string, stopIds: string[]): Promise<ETAResponse[]> {
    const etas = await Promise.allSettled(
      stopIds.map(stopId => this.calculateETA(vehicleId, stopId))
    );

    return etas
      .filter((result): result is PromiseFulfilledResult<ETAResponse> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Get ETAs for all buses approaching a stop
   */
  static async getETAsForStop(stopId: string, routeId?: string): Promise<ETAResponse[]> {
    try {
      // Get all active buses (vehicles with recent positions)
      // This is a simplified version - in production, you'd query active vehicles
      const cacheKey = `stop:etas:${stopId}`;
      const cached = await cacheService.get<ETAResponse[]>(cacheKey);
      
      // For now, return cached or empty array
      // In production, this would query active vehicles on the route
      return cached || [];
    } catch (error) {
      logger.error(`Failed to get ETAs for stop ${stopId}`, error);
      return [];
    }
  }

  /**
   * Invalidate ETA cache for a vehicle
   */
  static async invalidateETACache(vehicleId: string): Promise<void> {
    // In production, you'd need to track all stop IDs for a vehicle
    // For now, this is a placeholder
    logger.debug(`ETA cache invalidated for vehicle ${vehicleId}`);
  }
}


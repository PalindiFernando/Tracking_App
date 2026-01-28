import { z } from 'zod';
import { db } from '../database/connection';
import { cacheService } from '../cache/redis';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

// GPS payload validation schema
const gpsPayloadSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  timestamp: z.number().positive('Timestamp must be positive'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  speed: z.number().min(0).max(200, 'Speed must be between 0 and 200 km/h').optional(),
  heading: z.number().min(0).max(360, 'Heading must be between 0 and 360').optional(),
  accuracy: z.number().min(0).optional(),
});

export type GPSPayload = z.infer<typeof gpsPayloadSchema>;

export interface GPSPosition {
  vehicle_id: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  created_at: Date;
}

export class GPSIngestService {
  /**
   * Validate and normalize GPS payload
   */
  static validateGPSPayload(data: unknown): GPSPayload {
    try {
      return gpsPayloadSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError(`Invalid GPS payload: ${error.errors.map(e => e.message).join(', ')}`, 400);
      }
      throw createError('Invalid GPS payload format', 400);
    }
  }

  /**
   * Check for duplicate GPS updates
   */
  static async isDuplicate(vehicleId: string, timestamp: number): Promise<boolean> {
    const cacheKey = `gps:last:${vehicleId}`;
    const lastUpdate = await cacheService.get<{ timestamp: number }>(cacheKey);
    
    if (lastUpdate && Math.abs(lastUpdate.timestamp - timestamp) < 1000) {
      return true; // Duplicate within 1 second
    }
    
    return false;
  }

  /**
   * Store GPS position in database
   */
  static async storePosition(position: GPSPosition): Promise<void> {
    try {
      await db.query(
        `INSERT INTO bus_positions (vehicle_id, timestamp, latitude, longitude, speed, heading, accuracy, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (vehicle_id, timestamp) DO NOTHING`,
        [
          position.vehicle_id,
          position.timestamp,
          position.latitude,
          position.longitude,
          position.speed || null,
          position.heading || null,
          position.accuracy || null,
          new Date()
        ]
      );
    } catch (error) {
      logger.error('Failed to store GPS position', error);
      throw createError('Failed to store GPS position', 500);
    }
  }

  /**
   * Cache latest position for quick access
   */
  static async cacheLatestPosition(vehicleId: string, position: GPSPosition): Promise<void> {
    const cacheKey = `gps:latest:${vehicleId}`;
    const lastUpdateKey = `gps:last:${vehicleId}`;
    
    await cacheService.set(cacheKey, position, 300); // 5 minutes
    await cacheService.set(lastUpdateKey, { timestamp: position.timestamp.getTime() }, 60);
  }

  /**
   * Process GPS update: validate, check duplicates, store, and cache
   */
  static async processGPSUpdate(data: unknown, apiKey: string): Promise<GPSPosition> {
    // Validate API key (simplified - implement proper API key validation)
    if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
      throw createError('Invalid API key', 401);
    }

    // Validate payload
    const payload = this.validateGPSPayload(data);

    // Check for duplicates
    const isDup = await this.isDuplicate(payload.vehicle_id, payload.timestamp);
    if (isDup) {
      throw createError('Duplicate GPS update', 409);
    }

    // Create position object
    const position: GPSPosition = {
      vehicle_id: payload.vehicle_id,
      timestamp: new Date(payload.timestamp * 1000), // Convert Unix timestamp to Date
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed,
      heading: payload.heading,
      accuracy: payload.accuracy,
      created_at: new Date()
    };

    // Store in database
    await this.storePosition(position);

    // Cache latest position
    await this.cacheLatestPosition(payload.vehicle_id, position);

    logger.info(`GPS update processed for vehicle ${payload.vehicle_id}`, {
      vehicle_id: payload.vehicle_id,
      lat: payload.latitude,
      lng: payload.longitude
    });

    return position;
  }

  /**
   * Get latest position for a vehicle
   */
  static async getLatestPosition(vehicleId: string): Promise<GPSPosition | null> {
    // Try cache first
    const cacheKey = `gps:latest:${vehicleId}`;
    const cached = await cacheService.get<GPSPosition>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fallback to database
    try {
      const result = await db.query(
        `SELECT vehicle_id, timestamp, latitude, longitude, speed, heading, accuracy, created_at
         FROM bus_positions
         WHERE vehicle_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [vehicleId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const position = result.rows[0] as GPSPosition;
      await this.cacheLatestPosition(vehicleId, position);
      return position;
    } catch (error) {
      logger.error(`Failed to get latest position for vehicle ${vehicleId}`, error);
      return null;
    }
  }
}


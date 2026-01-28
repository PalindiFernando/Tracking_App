import { db } from '../database/connection';
import { logger } from '../utils/logger';
import { ETACalculationService } from './etaCalculation';

/**
 * ML-based ETA Prediction Service
 * Uses historical data to improve ETA predictions
 */
export class MLETAPredictionService {
  /**
   * Calculate ML-enhanced ETA using historical data
   */
  static async calculateMLETA(
    vehicleId: string,
    stopId: string,
    currentLat: number,
    currentLon: number,
    stopLat: number,
    stopLon: number
  ): Promise<{
    eta_minutes: number;
    confidence: 'high' | 'medium' | 'low';
    ml_adjustment: number;
    base_eta: number;
  }> {
    try {
      // Get base ETA from Google API
      const baseETA = await ETACalculationService.calculateETA(vehicleId, stopId);
      let mlAdjustedETA = baseETA.eta_minutes;

      // Get historical data for similar conditions
      const historicalData = await this.getHistoricalData(vehicleId, stopId);

      if (historicalData.length > 0) {
        // Calculate average error from historical data
        const avgError = this.calculateAverageError(historicalData);
        
        // Apply ML adjustment (weighted average of base ETA and historical average)
        const historicalAvg = this.calculateHistoricalAverage(historicalData);
        const mlWeight = Math.min(historicalData.length / 10, 0.5); // Max 50% weight from ML
        mlAdjustedETA = Math.round(
          baseETA.eta_minutes * (1 - mlWeight) + historicalAvg * mlWeight
        );

        // Adjust for current conditions
        const timeOfDayAdjustment = this.getTimeOfDayAdjustment();
        mlAdjustedETA = Math.round(mlAdjustedETA * timeOfDayAdjustment);
      }

      // Determine confidence based on data availability
      let confidence: 'high' | 'medium' | 'low' = 'high';
      if (historicalData.length < 5) {
        confidence = 'medium';
      }
      if (historicalData.length < 2) {
        confidence = 'low';
      }

      return {
        eta_minutes: Math.max(1, mlAdjustedETA), // Minimum 1 minute
        confidence,
        ml_adjustment: mlAdjustedETA - baseETA.eta_minutes,
        base_eta: baseETA.eta_minutes,
      };
    } catch (error) {
      logger.error('ML ETA calculation error', error);
      // Fallback to base ETA
      const baseETA = await ETACalculationService.calculateETA(vehicleId, stopId);
      return {
        eta_minutes: baseETA.eta_minutes,
        confidence: 'low',
        ml_adjustment: 0,
        base_eta: baseETA.eta_minutes,
      };
    }
  }

  /**
   * Get historical ETA data for similar conditions
   */
  private static async getHistoricalData(
    vehicleId: string,
    stopId: string,
    limit: number = 20
  ): Promise<Array<{
    predicted_eta_minutes: number;
    actual_arrival_minutes: number;
    hour_of_day: number;
    day_of_week: number;
  }>> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      // Get historical data from similar time periods (within 2 hours)
      const result = await db.query(
        `SELECT predicted_eta_minutes, actual_arrival_minutes, hour_of_day, day_of_week
         FROM ml_eta_training_data
         WHERE vehicle_id = $1 AND stop_id = $2
         AND actual_arrival_minutes IS NOT NULL
         AND (
           (hour_of_day BETWEEN $3 AND $5) OR
           (day_of_week = $4)
         )
         ORDER BY created_at DESC
         LIMIT $6`,
        [vehicleId, stopId, Math.max(0, currentHour - 2), currentDay, Math.min(23, currentHour + 2), limit]
      );

      return result.rows.map(row => ({
        predicted_eta_minutes: row.predicted_eta_minutes,
        actual_arrival_minutes: row.actual_arrival_minutes,
        hour_of_day: row.hour_of_day,
        day_of_week: row.day_of_week,
      }));
    } catch (error) {
      logger.error('Get historical data error', error);
      return [];
    }
  }

  /**
   * Calculate average error from historical predictions
   */
  private static calculateAverageError(
    historicalData: Array<{ predicted_eta_minutes: number; actual_arrival_minutes: number }>
  ): number {
    if (historicalData.length === 0) return 0;

    const errors = historicalData.map(
      data => data.actual_arrival_minutes - data.predicted_eta_minutes
    );
    return errors.reduce((sum, err) => sum + err, 0) / errors.length;
  }

  /**
   * Calculate historical average ETA
   */
  private static calculateHistoricalAverage(
    historicalData: Array<{ actual_arrival_minutes: number }>
  ): number {
    if (historicalData.length === 0) return 0;

    const sum = historicalData.reduce(
      (acc, data) => acc + data.actual_arrival_minutes,
      0
    );
    return Math.round(sum / historicalData.length);
  }

  /**
   * Get time-of-day adjustment factor
   * Rush hours typically have longer travel times
   */
  private static getTimeOfDayAdjustment(): number {
    const hour = new Date().getHours();
    
    // Rush hours: 7-9 AM and 5-7 PM
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      return 1.15; // 15% longer
    }
    
    // Late night/early morning: 11 PM - 5 AM
    if (hour >= 23 || hour < 5) {
      return 0.9; // 10% shorter
    }
    
    return 1.0; // Normal
  }

  /**
   * Store ETA prediction for ML training
   */
  static async storeTrainingData(
    vehicleId: string,
    stopId: string,
    routeId: string | null,
    predictedETAMinutes: number,
    distanceKm: number
  ): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      await db.query(
        `INSERT INTO ml_eta_training_data
         (vehicle_id, stop_id, route_id, predicted_eta_minutes, distance_km, hour_of_day, day_of_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [vehicleId, stopId, routeId, predictedETAMinutes, distanceKm, hour, dayOfWeek]
      );
    } catch (error) {
      logger.error('Store training data error', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Update actual arrival time for training data
   */
  static async updateActualArrival(
    vehicleId: string,
    stopId: string,
    actualArrivalMinutes: number
  ): Promise<void> {
    try {
      // Update the most recent prediction for this vehicle-stop pair
      await db.query(
        `UPDATE ml_eta_training_data
         SET actual_arrival_minutes = $1
         WHERE vehicle_id = $2 AND stop_id = $3
         AND actual_arrival_minutes IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [actualArrivalMinutes, vehicleId, stopId]
      );
    } catch (error) {
      logger.error('Update actual arrival error', error);
    }
  }
}


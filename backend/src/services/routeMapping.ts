import { db } from '../database/connection';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
  stop_desc?: string;
}

export interface RouteSegment {
  segment_id: string;
  route_id: string;
  sequence: number;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

export class RouteMappingService {
  /**
   * Map GPS coordinates to nearest route
   */
  static async mapToRoute(latitude: number, longitude: number, toleranceMeters: number = 50): Promise<Route | null> {
    try {
      // Find nearest route segment using PostGIS distance calculation
      // For simplicity, using basic distance calculation
      const result = await db.query(
        `SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name, r.route_type, r.route_color, r.route_text_color
         FROM routes r
         JOIN shapes s ON r.route_id = s.route_id
         WHERE (
           6371000 * acos(
             cos(radians($1)) * cos(radians(s.shape_pt_lat)) *
             cos(radians(s.shape_pt_lon) - radians($2)) +
             sin(radians($1)) * sin(radians(s.shape_pt_lat))
           )
         ) <= $3
         ORDER BY (
           6371000 * acos(
             cos(radians($1)) * cos(radians(s.shape_pt_lat)) *
             cos(radians(s.shape_pt_lon) - radians($2)) +
             sin(radians($1)) * sin(radians(s.shape_pt_lat))
           )
         )
         LIMIT 1`,
        [latitude, longitude, toleranceMeters]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Route;
    } catch (error) {
      logger.error('Route mapping error', error);
      return null;
    }
  }

  /**
   * Get route by ID
   */
  static async getRoute(routeId: string): Promise<Route | null> {
    try {
      const result = await db.query(
        `SELECT route_id, route_short_name, route_long_name, route_type, route_color, route_text_color
         FROM routes
         WHERE route_id = $1`,
        [routeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Route;
    } catch (error) {
      logger.error(`Failed to get route ${routeId}`, error);
      return null;
    }
  }

  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<Route[]> {
    try {
      const result = await db.query(
        `SELECT route_id, route_short_name, route_long_name, route_type, route_color, route_text_color
         FROM routes
         ORDER BY route_short_name`
      );

      return result.rows as Route[];
    } catch (error) {
      logger.error('Failed to get all routes', error);
      return [];
    }
  }

  /**
   * Get stops for a route
   */
  static async getRouteStops(routeId: string, direction: 'inbound' | 'outbound' = 'outbound'): Promise<Stop[]> {
    try {
      const directionId = direction === 'inbound' ? 1 : 0;
      
      const result = await db.query(
        `SELECT DISTINCT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, s.stop_code, s.stop_desc
         FROM stops s
         JOIN stop_times st ON s.stop_id = st.stop_id
         JOIN trips t ON st.trip_id = t.trip_id
         WHERE t.route_id = $1 AND t.direction_id = $2
         ORDER BY st.stop_sequence`,
        [routeId, directionId]
      );

      return result.rows as Stop[];
    } catch (error) {
      logger.error(`Failed to get stops for route ${routeId}`, error);
      return [];
    }
  }

  /**
   * Get upcoming stops along route from current position
   */
  static async getUpcomingStops(
    routeId: string,
    latitude: number,
    longitude: number,
    direction: 'inbound' | 'outbound' = 'outbound',
    limit: number = 5
  ): Promise<Stop[]> {
    try {
      const directionId = direction === 'inbound' ? 1 : 0;
      
      const result = await db.query(
        `SELECT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, s.stop_code, s.stop_desc,
                (
                  6371000 * acos(
                    cos(radians($2)) * cos(radians(s.stop_lat)) *
                    cos(radians(s.stop_lon) - radians($3)) +
                    sin(radians($2)) * sin(radians(s.stop_lat))
                  )
                ) AS distance
         FROM stops s
         JOIN stop_times st ON s.stop_id = st.stop_id
         JOIN trips t ON st.trip_id = t.trip_id
         WHERE t.route_id = $1 AND t.direction_id = $4
         HAVING distance > 100
         ORDER BY distance
         LIMIT $5`,
        [routeId, latitude, longitude, directionId, limit]
      );

      return result.rows.map(row => ({
        stop_id: row.stop_id,
        stop_name: row.stop_name,
        stop_lat: row.stop_lat,
        stop_lon: row.stop_lon,
        stop_code: row.stop_code,
        stop_desc: row.stop_desc
      })) as Stop[];
    } catch (error) {
      logger.error('Failed to get upcoming stops', error);
      return [];
    }
  }

  /**
   * Get stop by ID
   */
  static async getStop(stopId: string): Promise<Stop | null> {
    try {
      const result = await db.query(
        `SELECT stop_id, stop_name, stop_lat, stop_lon, stop_code, stop_desc
         FROM stops
         WHERE stop_id = $1`,
        [stopId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Stop;
    } catch (error) {
      logger.error(`Failed to get stop ${stopId}`, error);
      return null;
    }
  }

  /**
   * Search stops by name or code
   */
  static async searchStops(query: string, limit: number = 20): Promise<Stop[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const result = await db.query(
        `SELECT stop_id, stop_name, stop_lat, stop_lon, stop_code, stop_desc
         FROM stops
         WHERE LOWER(stop_name) LIKE $1 OR LOWER(stop_code) LIKE $1
         ORDER BY stop_name
         LIMIT $2`,
        [searchTerm, limit]
      );

      return result.rows as Stop[];
    } catch (error) {
      logger.error('Failed to search stops', error);
      return [];
    }
  }
}


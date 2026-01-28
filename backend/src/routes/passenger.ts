import { Router, Response } from 'express';
import { authenticate, requireRole, optionalAuth, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import { RouteMappingService } from '../services/routeMapping';
import { ETACalculationService } from '../services/etaCalculation';
import { GPSIngestService } from '../services/gpsIngest';

const router = Router();

/**
 * GET /api/passenger/routes/search
 * Search routes by number or name
 */
router.get('/routes/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    const searchTerm = (q as string) || '';

    if (!searchTerm) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const result = await db.query(
      `SELECT route_id, route_short_name, route_long_name, route_type, route_color, route_text_color
       FROM routes
       WHERE LOWER(route_short_name) LIKE $1 OR LOWER(route_long_name) LIKE $1
       ORDER BY route_short_name
       LIMIT 20`,
      [`%${searchTerm.toLowerCase()}%`]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Route search error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search routes',
    });
  }
});

/**
 * GET /api/passenger/buses/:routeId
 * Get all active buses for a route
 */
router.get('/buses/:routeId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { routeId } = req.params;

    // Get all vehicles on this route with their latest positions
    const result = await db.query(
      `SELECT DISTINCT v.vehicle_id, v.vehicle_type, v.capacity, v.status,
              bp.latitude, bp.longitude, bp.timestamp, bp.speed, bp.heading,
              dt.current_status, dt.delay_minutes
       FROM vehicles v
       LEFT JOIN bus_positions bp ON v.vehicle_id = bp.vehicle_id
       LEFT JOIN driver_trips dt ON v.vehicle_id = dt.vehicle_id AND dt.trip_status = 'in_progress'
       WHERE v.route_id = $1 AND v.status = 'active'
       AND bp.timestamp = (
         SELECT MAX(timestamp) FROM bus_positions WHERE vehicle_id = v.vehicle_id
       )
       ORDER BY bp.timestamp DESC`,
      [routeId]
    );

    const buses = result.rows.map(row => ({
      vehicle_id: row.vehicle_id,
      vehicle_type: row.vehicle_type,
      capacity: row.capacity,
      position: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        timestamp: row.timestamp,
        speed: row.speed ? parseFloat(row.speed) : null,
        heading: row.heading ? parseFloat(row.heading) : null,
      },
      status: row.current_status || 'running',
      delay_minutes: row.delay_minutes || 0,
    }));

    res.json({
      success: true,
      data: buses,
    });
  } catch (error: any) {
    logger.error('Get buses for route error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get buses',
    });
  }
});

/**
 * GET /api/passenger/bus/:vehicleId/track
 * Get real-time tracking data for a specific bus
 */
router.get('/bus/:vehicleId/track', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.params;

    const position = await GPSIngestService.getLatestPosition(vehicleId);
    if (!position) {
      throw createError('Bus not found or no position data', 404);
    }

    // Get route information
    const route = await RouteMappingService.mapToRoute(position.latitude, position.longitude);

    // Get vehicle info
    const vehicleResult = await db.query(
      `SELECT v.*, dt.current_status, dt.delay_minutes, dt.notes
       FROM vehicles v
       LEFT JOIN driver_trips dt ON v.vehicle_id = dt.vehicle_id AND dt.trip_status = 'in_progress'
       WHERE v.vehicle_id = $1`,
      [vehicleId]
    );

    const vehicle = vehicleResult.rows[0] || {};

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        position: {
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.timestamp,
          speed: position.speed,
          heading: position.heading,
        },
        route: route || null,
        status: vehicle.current_status || 'running',
        delay_minutes: vehicle.delay_minutes || 0,
        notes: vehicle.notes || null,
      },
    });
  } catch (error: any) {
    logger.error('Track bus error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to track bus',
    });
  }
});

/**
 * GET /api/passenger/eta/:vehicleId/:stopId
 * Get ML-based ETA prediction for bus to stop
 */
router.get('/eta/:vehicleId/:stopId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, stopId } = req.params;

    const eta = await ETACalculationService.calculateETA(vehicleId, stopId);

    res.json({
      success: true,
      data: eta,
    });
  } catch (error: any) {
    logger.error('Get ETA error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to calculate ETA',
    });
  }
});

/**
 * GET /api/passenger/alternatives/:routeId/:stopId
 * Get alternative routes/buses if current route is delayed
 */
router.get('/alternatives/:routeId/:stopId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { routeId, stopId } = req.params;

    // Get the target stop
    const stop = await RouteMappingService.getStop(stopId);
    if (!stop) {
      throw createError('Stop not found', 404);
    }

    // Check if route is delayed
    const delayedBuses = await db.query(
      `SELECT DISTINCT v.vehicle_id, v.route_id, dt.delay_minutes
       FROM vehicles v
       JOIN driver_trips dt ON v.vehicle_id = dt.vehicle_id
       WHERE v.route_id = $1 AND dt.trip_status = 'in_progress' AND dt.delay_minutes > 5`,
      [routeId]
    );

    if (delayedBuses.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          is_delayed: false,
          alternatives: [],
        },
      });
    }

    // Find alternative routes that serve the same stop
    const alternatives = await db.query(
      `SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name,
              v.vehicle_id, bp.latitude, bp.longitude, bp.timestamp,
              dt.delay_minutes as route_delay
       FROM routes r
       JOIN route_stop_sequence rss ON r.route_id = rss.route_id
       JOIN vehicles v ON r.route_id = v.route_id
       LEFT JOIN bus_positions bp ON v.vehicle_id = bp.vehicle_id
       LEFT JOIN driver_trips dt ON v.vehicle_id = dt.vehicle_id AND dt.trip_status = 'in_progress'
       WHERE rss.stop_id = $1
       AND r.route_id != $2
       AND v.status = 'active'
       AND bp.timestamp = (
         SELECT MAX(timestamp) FROM bus_positions WHERE vehicle_id = v.vehicle_id
       )
       ORDER BY route_delay ASC, bp.timestamp DESC
       LIMIT 5`,
      [stopId, routeId]
    );

    // Calculate ETAs for alternatives
    const alternativesWithETA = await Promise.all(
      alternatives.rows.map(async (alt) => {
        try {
          const eta = await ETACalculationService.calculateETA(alt.vehicle_id, stopId);
          return {
            route_id: alt.route_id,
            route_short_name: alt.route_short_name,
            route_long_name: alt.route_long_name,
            vehicle_id: alt.vehicle_id,
            position: {
              latitude: parseFloat(alt.latitude),
              longitude: parseFloat(alt.longitude),
            },
            eta_minutes: eta.eta_minutes,
            delay_minutes: alt.route_delay || 0,
          };
        } catch {
          return null;
        }
      })
    );

    res.json({
      success: true,
      data: {
        is_delayed: true,
        delay_minutes: Math.max(...delayedBuses.rows.map(b => b.delay_minutes)),
        alternatives: alternativesWithETA.filter(a => a !== null),
      },
    });
  } catch (error: any) {
    logger.error('Get alternatives error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get alternatives',
    });
  }
});

/**
 * POST /api/passenger/favorites
 * Add a favorite route/stop/bus (requires authentication)
 */
router.post('/favorites', authenticate, requireRole('passenger'), async (req: AuthRequest, res: Response) => {
  try {
    const { favorite_type, favorite_id } = req.body;
    const userId = req.user!.id;

    if (!['route', 'stop', 'bus'].includes(favorite_type)) {
      throw createError('Invalid favorite type', 400);
    }

    const result = await db.query(
      `INSERT INTO passenger_favorites (user_id, favorite_type, favorite_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, favorite_type, favorite_id) DO NOTHING
       RETURNING *`,
      [userId, favorite_type, favorite_id]
    );

    res.json({
      success: true,
      data: result.rows[0] || { message: 'Already in favorites' },
    });
  } catch (error: any) {
    logger.error('Add favorite error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to add favorite',
    });
  }
});

/**
 * GET /api/passenger/favorites
 * Get user favorites (requires authentication)
 */
router.get('/favorites', authenticate, requireRole('passenger'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await db.query(
      `SELECT * FROM passenger_favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Get favorites error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get favorites',
    });
  }
});

/**
 * GET /api/passenger/notifications
 * Get passenger notifications (requires authentication)
 */
router.get('/notifications', authenticate, requireRole('passenger'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, unread_only = false } = req.query;

    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params: any[] = [userId];

    if (unread_only === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY sent_at DESC LIMIT $2';
    params.push(parseInt(limit as string));

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Get notifications error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
    });
  }
});

/**
 * PUT /api/passenger/notifications/:notificationId/read
 * Mark notification as read (requires authentication)
 */
router.put('/notifications/:notificationId/read', authenticate, requireRole('passenger'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw createError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Mark notification as read error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to mark notification as read',
    });
  }
});

export default router;


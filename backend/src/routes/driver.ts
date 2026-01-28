import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import { GPSIngestService } from '../services/gpsIngest';

const router = Router();

// All driver routes require authentication and driver role
router.use(authenticate);
router.use(requireRole('driver'));

/**
 * POST /api/driver/trip/start
 * Start a new trip
 */
router.post('/trip/start', async (req: AuthRequest, res: Response) => {
  try {
    const { route_id, scheduled_start_time } = req.body;
    const driverId = req.user!.id;
    const vehicleId = req.user!.vehicle_id;

    if (!vehicleId) {
      throw createError('No vehicle assigned to driver', 400);
    }

    // Check if there's an active trip
    const activeTrip = await db.query(
      `SELECT id FROM driver_trips
       WHERE driver_id = $1 AND trip_status = 'in_progress'`,
      [driverId]
    );

    if (activeTrip.rows.length > 0) {
      throw createError('Driver already has an active trip', 400);
    }

    // Create new trip
    const result = await db.query(
      `INSERT INTO driver_trips (driver_id, vehicle_id, route_id, trip_status, scheduled_start_time, actual_start_time, current_status)
       VALUES ($1, $2, $3, 'in_progress', $4, CURRENT_TIMESTAMP, 'running')
       RETURNING *`,
      [driverId, vehicleId, route_id || null, scheduled_start_time || null]
    );

    logger.info(`Driver ${req.user!.username} started trip`, { tripId: result.rows[0].id });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Start trip error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to start trip',
    });
  }
});

/**
 * POST /api/driver/trip/stop
 * Stop the current trip
 */
router.post('/trip/stop', async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user!.id;

    // Find active trip
    const tripResult = await db.query(
      `SELECT id FROM driver_trips
       WHERE driver_id = $1 AND trip_status = 'in_progress'`,
      [driverId]
    );

    if (tripResult.rows.length === 0) {
      throw createError('No active trip found', 404);
    }

    // Update trip status
    const result = await db.query(
      `UPDATE driver_trips
       SET trip_status = 'completed',
           actual_end_time = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [tripResult.rows[0].id]
    );

    logger.info(`Driver ${req.user!.username} stopped trip`, { tripId: result.rows[0].id });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Stop trip error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to stop trip',
    });
  }
});

/**
 * GET /api/driver/trip/current
 * Get current active trip
 */
router.get('/trip/current', async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user!.id;

    const result = await db.query(
      `SELECT dt.*, v.vehicle_id, v.vehicle_type, r.route_short_name, r.route_long_name
       FROM driver_trips dt
       LEFT JOIN vehicles v ON dt.vehicle_id = v.vehicle_id
       LEFT JOIN routes r ON dt.route_id = r.route_id
       WHERE dt.driver_id = $1 AND dt.trip_status = 'in_progress'
       ORDER BY dt.actual_start_time DESC
       LIMIT 1`,
      [driverId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Get current trip error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current trip',
    });
  }
});

/**
 * PUT /api/driver/status
 * Update driver status (running, delayed, break, maintenance)
 */
router.put('/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, delay_minutes, notes } = req.body;
    const driverId = req.user!.id;

    const validStatuses = ['running', 'delayed', 'break', 'maintenance'];
    if (!status || !validStatuses.includes(status)) {
      throw createError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Update current trip status if active
    await db.query(
      `UPDATE driver_trips
       SET current_status = $1,
           delay_minutes = COALESCE($2, delay_minutes),
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE driver_id = $4 AND trip_status = 'in_progress'`,
      [status, delay_minutes || null, notes || null, driverId]
    );

    logger.info(`Driver ${req.user!.username} updated status to ${status}`);

    res.json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    logger.error('Update status error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update status',
    });
  }
});

/**
 * POST /api/driver/location
 * Broadcast current GPS location (used by driver app)
 */
router.post('/location', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, speed, heading, accuracy } = req.body;
    const vehicleId = req.user!.vehicle_id;

    if (!vehicleId) {
      throw createError('No vehicle assigned to driver', 400);
    }

    if (!latitude || !longitude) {
      throw createError('Latitude and longitude required', 400);
    }

    // Process GPS update (same as device API)
    const position = await GPSIngestService.processGPSUpdate(
      {
        vehicle_id: vehicleId,
        timestamp: Math.floor(Date.now() / 1000),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed ? parseFloat(speed) : undefined,
        heading: heading ? parseFloat(heading) : undefined,
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
      },
      process.env.API_KEY_SECRET || 'device-api-key-secret'
    );

    // Update vehicle last_seen
    await db.query(
      'UPDATE vehicles SET last_seen = CURRENT_TIMESTAMP WHERE vehicle_id = $1',
      [vehicleId]
    );

    res.json({
      success: true,
      data: {
        position,
        message: 'Location updated successfully',
      },
    });
  } catch (error: any) {
    logger.error('Location update error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update location',
    });
  }
});

/**
 * GET /api/driver/notifications
 * Get driver notifications/alerts
 */
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user!.id;
    const { limit = 20, unread_only = false } = req.query;

    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params: any[] = [driverId];

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
 * PUT /api/driver/notifications/:id/read
 * Mark notification as read
 */
router.put('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user!.id;
    const notificationId = req.params.id;

    await db.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [notificationId, driverId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    logger.error('Mark notification read error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
});

export default router;


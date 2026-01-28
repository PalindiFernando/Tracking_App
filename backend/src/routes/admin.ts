import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import bcrypt from 'bcryptjs';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ==================== BUS MANAGEMENT ====================

/**
 * GET /api/admin/buses
 * Get all buses with pagination
 */
router.get('/buses', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, route_id } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `SELECT v.*, r.route_short_name, r.route_long_name,
                        u.id as driver_id, u.username as driver_username, u.full_name as driver_name
                 FROM vehicles v
                 LEFT JOIN routes r ON v.route_id = r.route_id
                 LEFT JOIN users u ON v.vehicle_id = u.vehicle_id AND u.role = 'driver'`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`v.status = $${params.length + 1}`);
      params.push(status);
    }

    if (route_id) {
      conditions.push(`v.route_id = $${params.length + 1}`);
      params.push(route_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await db.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM vehicles v ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await db.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error: any) {
    logger.error('Get buses error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get buses',
    });
  }
});

/**
 * POST /api/admin/buses
 * Create a new bus
 */
router.post('/buses', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicle_id, route_id, vehicle_type, capacity, status = 'active' } = req.body;

    if (!vehicle_id) {
      throw createError('Vehicle ID is required', 400);
    }

    const result = await db.query(
      `INSERT INTO vehicles (vehicle_id, route_id, vehicle_type, capacity, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicle_id, route_id || null, vehicle_type || null, capacity || null, status]
    );

    logger.info(`Admin ${req.user!.username} created bus ${vehicle_id}`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Vehicle ID already exists',
      });
      return;
    }
    logger.error('Create bus error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create bus',
    });
  }
});

/**
 * PUT /api/admin/buses/:vehicleId
 * Update a bus
 */
router.put('/buses/:vehicleId', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { route_id, vehicle_type, capacity, status } = req.body;

    const result = await db.query(
      `UPDATE vehicles
       SET route_id = COALESCE($1, route_id),
           vehicle_type = COALESCE($2, vehicle_type),
           capacity = COALESCE($3, capacity),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_id = $5
       RETURNING *`,
      [route_id, vehicle_type, capacity, status, vehicleId]
    );

    if (result.rows.length === 0) {
      throw createError('Bus not found', 404);
    }

    logger.info(`Admin ${req.user!.username} updated bus ${vehicleId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Update bus error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update bus',
    });
  }
});

/**
 * DELETE /api/admin/buses/:vehicleId
 * Delete a bus
 */
router.delete('/buses/:vehicleId', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.params;

    const result = await db.query(
      'DELETE FROM vehicles WHERE vehicle_id = $1 RETURNING *',
      [vehicleId]
    );

    if (result.rows.length === 0) {
      throw createError('Bus not found', 404);
    }

    logger.info(`Admin ${req.user!.username} deleted bus ${vehicleId}`);

    res.json({
      success: true,
      message: 'Bus deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete bus error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete bus',
    });
  }
});

// ==================== ROUTE MANAGEMENT ====================

/**
 * GET /api/admin/routes
 * Get all routes
 */
router.get('/routes', async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT r.*, COUNT(DISTINCT v.vehicle_id) as vehicle_count
       FROM routes r
       LEFT JOIN vehicles v ON r.route_id = v.route_id
       GROUP BY r.route_id
       ORDER BY r.route_short_name`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Get routes error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get routes',
    });
  }
});

/**
 * POST /api/admin/routes
 * Create a new route
 */
router.post('/routes', async (req: AuthRequest, res: Response) => {
  try {
    const {
      route_id,
      route_short_name,
      route_long_name,
      route_desc,
      route_type,
      route_color,
      route_text_color,
    } = req.body;

    if (!route_id || !route_short_name) {
      throw createError('Route ID and short name are required', 400);
    }

    const result = await db.query(
      `INSERT INTO routes (route_id, route_short_name, route_long_name, route_desc, route_type, route_color, route_text_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [route_id, route_short_name, route_long_name || null, route_desc || null, route_type || null, route_color || null, route_text_color || null]
    );

    logger.info(`Admin ${req.user!.username} created route ${route_id}`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Route ID already exists',
      });
      return;
    }
    logger.error('Create route error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create route',
    });
  }
});

/**
 * PUT /api/admin/routes/:routeId
 * Update a route
 */
router.put('/routes/:routeId', async (req: AuthRequest, res: Response) => {
  try {
    const { routeId } = req.params;
    const { route_short_name, route_long_name, route_desc, route_type, route_color, route_text_color } = req.body;

    const result = await db.query(
      `UPDATE routes
       SET route_short_name = COALESCE($1, route_short_name),
           route_long_name = COALESCE($2, route_long_name),
           route_desc = COALESCE($3, route_desc),
           route_type = COALESCE($4, route_type),
           route_color = COALESCE($5, route_color),
           route_text_color = COALESCE($6, route_text_color)
       WHERE route_id = $7
       RETURNING *`,
      [route_short_name, route_long_name, route_desc, route_type, route_color, route_text_color, routeId]
    );

    if (result.rows.length === 0) {
      throw createError('Route not found', 404);
    }

    logger.info(`Admin ${req.user!.username} updated route ${routeId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Update route error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update route',
    });
  }
});

/**
 * DELETE /api/admin/routes/:routeId
 * Delete a route
 */
router.delete('/routes/:routeId', async (req: AuthRequest, res: Response) => {
  try {
    const { routeId } = req.params;

    const result = await db.query('DELETE FROM routes WHERE route_id = $1 RETURNING *', [routeId]);

    if (result.rows.length === 0) {
      throw createError('Route not found', 404);
    }

    logger.info(`Admin ${req.user!.username} deleted route ${routeId}`);

    res.json({
      success: true,
      message: 'Route deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete route error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete route',
    });
  }
});

/**
 * GET /api/admin/routes/:routeId/stops
 * Get stop sequence for a route
 */
router.get('/routes/:routeId/stops', async (req: AuthRequest, res: Response) => {
  try {
    const { routeId } = req.params;
    const { direction = '0' } = req.query;

    const result = await db.query(
      `SELECT rss.*, s.stop_name, s.stop_lat, s.stop_lon, s.stop_code
       FROM route_stop_sequence rss
       JOIN stops s ON rss.stop_id = s.stop_id
       WHERE rss.route_id = $1 AND rss.direction_id = $2
       ORDER BY rss.sequence_order`,
      [routeId, parseInt(direction as string)]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('Get route stops error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get route stops',
    });
  }
});

/**
 * POST /api/admin/routes/:routeId/stops
 * Set stop sequence for a route
 */
router.post('/routes/:routeId/stops', async (req: AuthRequest, res: Response) => {
  try {
    const { routeId } = req.params;
    const { stops, direction_id = 0 } = req.body; // stops: [{stop_id, sequence_order, estimated_time_minutes}]

    if (!Array.isArray(stops)) {
      throw createError('Stops must be an array', 400);
    }

    // Delete existing sequence
    await db.query(
      'DELETE FROM route_stop_sequence WHERE route_id = $1 AND direction_id = $2',
      [routeId, direction_id]
    );

    // Insert new sequence
    for (const stop of stops) {
      await db.query(
        `INSERT INTO route_stop_sequence (route_id, stop_id, sequence_order, direction_id, estimated_time_minutes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (route_id, stop_id, direction_id, sequence_order) DO UPDATE
         SET estimated_time_minutes = EXCLUDED.estimated_time_minutes`,
        [routeId, stop.stop_id, stop.sequence_order, direction_id, stop.estimated_time_minutes || null]
      );
    }

    logger.info(`Admin ${req.user!.username} updated stop sequence for route ${routeId}`);

    res.json({
      success: true,
      message: 'Stop sequence updated successfully',
    });
  } catch (error: any) {
    logger.error('Update route stops error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update stop sequence',
    });
  }
});

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, role, is_verified, is_active } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `SELECT u.*, v.vehicle_id as assigned_vehicle
                 FROM users u
                 LEFT JOIN vehicles v ON u.vehicle_id = v.vehicle_id
                 WHERE 1=1`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (role) {
      conditions.push(`u.role = $${params.length + 1}`);
      params.push(role);
    }

    if (is_verified !== undefined) {
      conditions.push(`u.is_verified = $${params.length + 1}`);
      params.push(is_verified === 'true');
    }

    if (is_active !== undefined) {
      conditions.push(`u.is_active = $${params.length + 1}`);
      params.push(is_active === 'true');
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await db.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1 ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}`;
    const countResult = await db.query(countQuery, params.slice(0, -2));

    // Remove password_hash from response
    const users = result.rows.map(({ password_hash, ...user }) => user);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error: any) {
    logger.error('Get users error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
});

/**
 * PUT /api/admin/users/:userId/verify
 * Verify a user (typically drivers)
 */
router.put('/users/:userId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `UPDATE users
       SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, email, role, is_verified`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    logger.info(`Admin ${req.user!.username} verified user ${userId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Verify user error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to verify user',
    });
  }
});

/**
 * PUT /api/admin/users/:userId/assign-vehicle
 * Assign a vehicle to a driver
 */
router.put('/users/:userId/assign-vehicle', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { vehicle_id } = req.body;

    // Check if user is a driver
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw createError('User not found', 404);
    }
    if (userResult.rows[0].role !== 'driver') {
      throw createError('Can only assign vehicles to drivers', 400);
    }

    // Check if vehicle exists
    if (vehicle_id) {
      const vehicleResult = await db.query('SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      if (vehicleResult.rows.length === 0) {
        throw createError('Vehicle not found', 404);
      }
    }

    const result = await db.query(
      `UPDATE users
       SET vehicle_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, vehicle_id`,
      [vehicle_id || null, userId]
    );

    logger.info(`Admin ${req.user!.username} assigned vehicle ${vehicle_id} to user ${userId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Assign vehicle error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to assign vehicle',
    });
  }
});

/**
 * PUT /api/admin/users/:userId/status
 * Activate/deactivate a user
 */
router.put('/users/:userId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      throw createError('is_active must be a boolean', 400);
    }

    const result = await db.query(
      `UPDATE users
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, is_active`,
      [is_active, userId]
    );

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    logger.info(`Admin ${req.user!.username} ${is_active ? 'activated' : 'deactivated'} user ${userId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Update user status error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update user status',
    });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin can create any role)
 */
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, phone, role, full_name, vehicle_id } = req.body;

    if (!username || !password || !role) {
      throw createError('Username, password, and role are required', 400);
    }

    if (!['passenger', 'driver', 'admin'].includes(role)) {
      throw createError('Invalid role', 400);
    }

    // Check if username/email exists
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email || '']
    );

    if (existing.rows.length > 0) {
      throw createError('Username or email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (username, password_hash, email, phone, role, full_name, vehicle_id, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, email, role, full_name, vehicle_id, is_verified`,
      [username, passwordHash, email || null, phone || null, role, full_name || null, vehicle_id || null, role === 'admin']
    );

    logger.info(`Admin ${req.user!.username} created user ${username} (${role})`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Create user error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create user',
    });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user (passenger or driver)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, phone, role, full_name } = req.body;

    if (!username || !password) {
      throw createError('Username and password required', 400);
    }

    if (!role || !['passenger', 'driver'].includes(role)) {
      throw createError('Valid role required (passenger or driver)', 400);
    }

    // Check if username already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email || '']
    );

    if (existingUser.rows.length > 0) {
      throw createError('Username or email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, password_hash, email, phone, role, full_name, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, role, full_name, is_verified`,
      [username, passwordHash, email || null, phone || null, role, full_name || null, role === 'driver' ? false : true]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User registered: ${username} (${role})`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          is_verified: user.is_verified,
        },
      },
    });
  } catch (error: any) {
    logger.error('Registration error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

/**
 * Hardcoded users for temporary use (bypasses database)
 */
const HARDCODED_USERS = {
  admin: {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@bustracking.com',
    role: 'admin' as const,
    full_name: 'System Administrator',
    vehicle_id: null,
    is_verified: true,
    is_active: true,
  },
  driver: {
    id: 2,
    username: 'driver',
    password: 'driver123',
    email: 'driver@bustracking.com',
    role: 'driver' as const,
    full_name: 'Test Driver',
    vehicle_id: 'BUS001',
    is_verified: true,
    is_active: true,
  },
  driver1: {
    id: 3,
    username: 'driver1',
    password: 'driver123',
    email: 'driver1@bustracking.com',
    role: 'driver' as const,
    full_name: 'John Driver',
    vehicle_id: 'BUS001',
    is_verified: true,
    is_active: true,
  },
  driver2: {
    id: 4,
    username: 'driver2',
    password: 'driver123',
    email: 'driver2@bustracking.com',
    role: 'driver' as const,
    full_name: 'Jane Driver',
    vehicle_id: 'BUS002',
    is_verified: true,
    is_active: true,
  },
  passenger: {
    id: 5,
    username: 'passenger',
    password: 'passenger123',
    email: 'passenger@bustracking.com',
    role: 'passenger' as const,
    full_name: 'Test Passenger',
    vehicle_id: null,
    is_verified: true,
    is_active: true,
  },
  passenger1: {
    id: 6,
    username: 'passenger1',
    password: 'passenger123',
    email: 'passenger1@bustracking.com',
    role: 'passenger' as const,
    full_name: 'Alice Passenger',
    vehicle_id: null,
    is_verified: true,
    is_active: true,
  },
  passenger2: {
    id: 7,
    username: 'passenger2',
    password: 'passenger123',
    email: 'passenger2@bustracking.com',
    role: 'passenger' as const,
    full_name: 'Bob Passenger',
    vehicle_id: null,
    is_verified: true,
    is_active: true,
  },
};

/**
 * POST /api/auth/login
 * User login (passenger, driver, or admin)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw createError('Username and password required', 400);
    }

    // Check hardcoded users first (temporary solution)
    const hardcodedUser = HARDCODED_USERS[username as keyof typeof HARDCODED_USERS];
    if (hardcodedUser && hardcodedUser.password === password) {
      // Generate token for hardcoded user
      const token = jwt.sign(
        {
          id: hardcodedUser.id,
          username: hardcodedUser.username,
          role: hardcodedUser.role,
          vehicle_id: hardcodedUser.vehicle_id,
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info(`User logged in (hardcoded): ${hardcodedUser.username} (${hardcodedUser.role})`);

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: hardcodedUser.id,
            username: hardcodedUser.username,
            email: hardcodedUser.email,
            role: hardcodedUser.role,
            full_name: hardcodedUser.full_name,
            vehicle_id: hardcodedUser.vehicle_id,
            is_verified: hardcodedUser.is_verified,
          },
        },
      });
    }

    // Fallback to database lookup (if database is available)
    try {
      // Find user
      const result = await db.query(
        `SELECT id, username, password_hash, email, role, full_name, vehicle_id, is_active, is_verified
         FROM users
         WHERE username = $1 OR email = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        throw createError('Invalid credentials', 401);
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw createError('Account is inactive', 403);
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw createError('Invalid credentials', 401);
      }

      // Update last login
      await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          vehicle_id: user.vehicle_id,
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info(`User logged in: ${user.username} (${user.role})`);

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            vehicle_id: user.vehicle_id,
            is_verified: user.is_verified,
          },
        },
      });
    } catch (dbError: any) {
      // If database query fails (e.g., table doesn't exist), only allow hardcoded users
      if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
        throw createError('Invalid credentials', 401);
      }
      throw dbError;
    }
  } catch (error: any) {
    logger.error('Login error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const username = req.user!.username;

    // Check if this is a hardcoded user
    const hardcodedUser = HARDCODED_USERS[username as keyof typeof HARDCODED_USERS];
    if (hardcodedUser) {
      return res.json({
        success: true,
        data: {
          id: hardcodedUser.id,
          username: hardcodedUser.username,
          email: hardcodedUser.email,
          phone: null,
          role: hardcodedUser.role,
          full_name: hardcodedUser.full_name,
          vehicle_id: hardcodedUser.vehicle_id,
          is_verified: hardcodedUser.is_verified,
          is_active: hardcodedUser.is_active,
          created_at: new Date().toISOString(),
          last_login: null,
        },
      });
    }

    // Fallback to database lookup
    try {
      const result = await db.query(
        `SELECT id, username, email, phone, role, full_name, vehicle_id, is_verified, is_active, created_at, last_login
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          full_name: user.full_name,
          vehicle_id: user.vehicle_id,
          is_verified: user.is_verified,
          is_active: user.is_active,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      });
    } catch (dbError: any) {
      // If database query fails, throw error
      if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
        throw createError('User not found', 404);
      }
      throw dbError;
    }
  } catch (error: any) {
    logger.error('Get profile error', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get profile',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token (backward compatibility)
 */
router.get('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export default router;


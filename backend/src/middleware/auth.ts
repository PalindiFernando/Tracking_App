import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { db } from '../database/connection';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'passenger' | 'driver' | 'admin';
    vehicle_id?: string;
  };
}

export interface JWTPayload {
  id: number;
  username: string;
  role: 'passenger' | 'driver' | 'admin';
  vehicle_id?: string;
}

/**
 * Hardcoded user IDs (temporary solution)
 */
const HARDCODED_USER_IDS = [1, 2, 3, 4, 5, 6, 7];
const HARDCODED_USERS_MAP: Record<number, { username: string; role: 'passenger' | 'driver' | 'admin'; vehicle_id?: string }> = {
  1: { username: 'admin', role: 'admin' },
  2: { username: 'driver', role: 'driver', vehicle_id: 'BUS001' },
  3: { username: 'driver1', role: 'driver', vehicle_id: 'BUS001' },
  4: { username: 'driver2', role: 'driver', vehicle_id: 'BUS002' },
  5: { username: 'passenger', role: 'passenger' },
  6: { username: 'passenger1', role: 'passenger' },
  7: { username: 'passenger2', role: 'passenger' },
};

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw createError('Authentication required', 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JWTPayload;

    // Check if this is a hardcoded user (temporary solution)
    if (HARDCODED_USER_IDS.includes(decoded.id)) {
      const hardcodedUser = HARDCODED_USERS_MAP[decoded.id];
      if (hardcodedUser) {
        req.user = {
          id: decoded.id,
          username: hardcodedUser.username,
          role: hardcodedUser.role,
          vehicle_id: hardcodedUser.vehicle_id,
        };
        return next();
      }
    }

    // Fallback to database lookup (if database is available)
    try {
      // Verify user still exists and is active
      const userResult = await db.query(
        `SELECT id, username, role, vehicle_id, is_active
         FROM users
         WHERE id = $1`,
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        throw createError('User not found', 401);
      }

      const user = userResult.rows[0];
      if (!user.is_active) {
        throw createError('User account is inactive', 403);
      }

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        vehicle_id: user.vehicle_id || undefined,
      };

      next();
    } catch (dbError: any) {
      // If database query fails (e.g., table doesn't exist), only allow hardcoded users
      if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
        throw createError('User not found', 401);
      }
      throw dbError;
    }
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.warn('Invalid token', { error: error.message });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }
    next(error);
  }
};

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (...allowedRoles: ('passenger' | 'driver' | 'admin')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        user: req.user.username,
        role: req.user.role,
        required: allowedRoles,
      });
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as JWTPayload;

      // Check if this is a hardcoded user
      if (HARDCODED_USER_IDS.includes(decoded.id)) {
        const hardcodedUser = HARDCODED_USERS_MAP[decoded.id];
        if (hardcodedUser) {
          req.user = {
            id: decoded.id,
            username: hardcodedUser.username,
            role: hardcodedUser.role,
            vehicle_id: hardcodedUser.vehicle_id,
          };
          return next();
        }
      }

      // Fallback to database lookup
      try {
        const userResult = await db.query(
          `SELECT id, username, role, vehicle_id, is_active
           FROM users
           WHERE id = $1 AND is_active = TRUE`,
          [decoded.id]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            vehicle_id: user.vehicle_id || undefined,
          };
        }
      } catch (dbError) {
        // Ignore database errors for optional auth
      }
    }
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};


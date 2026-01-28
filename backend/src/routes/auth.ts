import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 * Operator login (simplified - implement proper authentication)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Simplified authentication - implement proper user management
    if (!username || !password) {
      throw createError('Username and password required', 400);
    }

    // In production, verify against database
    // For now, accept any credentials (NOT FOR PRODUCTION)
    const token = jwt.sign(
      { username, role: 'operator' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { username, role: 'operator' }
      }
    });
  } catch (error: any) {
    logger.error('Login error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw createError('Token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    res.json({
      success: true,
      data: decoded
    });
  } catch (error: any) {
    logger.error('Token verification error', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

export default router;


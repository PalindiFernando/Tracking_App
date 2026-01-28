import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { db } from './database/connection';
import { setupWebSocket } from './websocket/server';

// Routes
import gpsRoutes from './routes/gps';
import busRoutes from './routes/buses';
import stopRoutes from './routes/stops';
import routeRoutes from './routes/routes';
import etaRoutes from './routes/eta';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for WebSocket
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  const services: Record<string, string> = {};
  let allHealthy = true;
  
  // Check database connection
  try {
    await db.query('SELECT 1');
    services.database = 'connected';
  } catch (error) {
    services.database = 'disconnected';
    allHealthy = false;
  }
  
  // Cache is now in-memory, no external service needed
  services.cache = 'in-memory';
  
  const status = allHealthy ? 'healthy' : 'degraded';
  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services
  });
});

// API Routes
app.use('/api/gps', rateLimiter, gpsRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/eta', etaRoutes);
app.use('/api/auth', authRoutes);

// Error handling
app.use(errorHandler);

// Setup WebSocket server
setupWebSocket(server);

// Start server
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  try {
    await db.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (error: any) {
    let errorCode = error.code || error.errno || 'UNKNOWN';
    let errorMessage = error.message;
    
    // Handle AggregateError (common with connection errors)
    if (error.name === 'AggregateError' && error.errors && error.errors.length > 0) {
      const firstError = error.errors[0];
      errorCode = firstError.code || firstError.errno || errorCode;
      errorMessage = firstError.message || firstError.toString() || errorMessage;
    }
    
    // Fallback if message is still not available
    if (!errorMessage || errorMessage === 'Connection failed') {
      if (errorCode === 'ECONNREFUSED') {
        errorMessage = `Connection refused - PostgreSQL server not available on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`;
      } else {
        errorMessage = error.toString().includes('ECONNREFUSED') 
          ? 'Connection refused - PostgreSQL server not available'
          : 'Connection failed';
      }
    }
    
    logger.warn(`Database connection failed: ${errorCode} - ${errorMessage}. Please ensure PostgreSQL is running.`);
  }
  
  // Using in-memory cache (no external service needed)
  logger.info('In-memory cache initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    db.end(() => {
      logger.info('Database connection closed');
      logger.info('Cache cleared');
      process.exit(0);
    });
  });
});

export default app;


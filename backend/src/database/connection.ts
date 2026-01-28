import { Pool } from 'pg';
import { logger } from '../utils/logger';

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'bustrack',
  password: process.env.DB_PASSWORD || 'bustrack123',
  database: process.env.DB_NAME || 'bustracking',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
});

db.on('error', (err) => {
  logger.error('Unexpected database error on idle client', err);
  // Don't exit immediately - let the application handle it gracefully
});

// Test connection (non-blocking)
db.query('SELECT NOW()', (err: any, res) => {
  if (err) {
    let errorCode = err.code || err.errno || 'UNKNOWN';
    let errorMessage = err.message;
    
    // Handle AggregateError
    if (err.name === 'AggregateError' && err.errors && err.errors.length > 0) {
      const firstError = err.errors[0];
      errorCode = firstError.code || firstError.errno || errorCode;
      errorMessage = firstError.message || firstError.toString() || errorMessage;
    }
    
    // Fallback if message is still not available
    if (!errorMessage || errorMessage === 'Connection failed') {
      if (errorCode === 'ECONNREFUSED') {
        errorMessage = `Connection refused - PostgreSQL server not available`;
      } else {
        errorMessage = err.toString().includes('ECONNREFUSED') 
          ? 'Connection refused - PostgreSQL server not available'
          : 'Connection failed';
      }
    }
    
    logger.warn(`Database connection test failed: ${errorCode} - ${errorMessage}. Will retry on first query.`);
  } else {
    logger.info('Database connection established');
  }
});


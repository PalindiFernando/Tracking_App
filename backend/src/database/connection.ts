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
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection test failed', err);
  } else {
    logger.info('Database connection established');
  }
});


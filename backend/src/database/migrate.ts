import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './connection';
import { logger } from '../utils/logger';
import { createTestUsers } from '../scripts/createTestUsers';

async function migrate(): Promise<void> {
  try {
    logger.info('Starting database migration...');

    // Read SQL file - try multiple possible paths
    let sqlPath: string;
    const possiblePaths = [
      join(__dirname, 'init.sql'),
      join(process.cwd(), 'src', 'database', 'init.sql'),
      join(process.cwd(), 'backend', 'src', 'database', 'init.sql'),
    ];

    let sql: string | null = null;
    for (const path of possiblePaths) {
      try {
        sql = readFileSync(path, 'utf-8');
        sqlPath = path;
        break;
      } catch (err) {
        // Try next path
      }
    }

    if (!sql) {
      throw new Error('Could not find init.sql file. Tried: ' + possiblePaths.join(', '));
    }

    logger.info(`Using SQL file: ${sqlPath}`);

    // Execute SQL statements (split by semicolon for multiple statements)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message?.includes('already exists')) {
            logger.warn(`Statement execution warning: ${error.message}`);
          }
        }
      }
    }

    logger.info('Database migration completed successfully');
    
    // Optionally create test users if CREATE_TEST_USERS env var is set
    if (process.env.CREATE_TEST_USERS === 'true') {
      logger.info('Creating test users...');
      await createTestUsers();
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', error);
    process.exit(1);
  }
}

migrate();


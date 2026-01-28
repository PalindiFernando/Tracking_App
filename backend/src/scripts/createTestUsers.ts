import bcrypt from 'bcryptjs';
import { db } from '../database/connection';
import { logger } from '../utils/logger';

interface TestUser {
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'driver' | 'passenger';
  full_name: string;
  vehicle_id?: string;
  is_verified: boolean;
}

const testUsers: TestUser[] = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@bustracking.com',
    role: 'admin',
    full_name: 'System Administrator',
    is_verified: true,
  },
  {
    username: 'driver1',
    password: 'driver123',
    email: 'driver1@bustracking.com',
    role: 'driver',
    full_name: 'John Driver',
    vehicle_id: 'BUS001', // Will need to create this vehicle first or handle gracefully
    is_verified: true,
  },
  {
    username: 'driver2',
    password: 'driver123',
    email: 'driver2@bustracking.com',
    role: 'driver',
    full_name: 'Jane Driver',
    vehicle_id: 'BUS002',
    is_verified: true,
  },
  {
    username: 'passenger1',
    password: 'passenger123',
    email: 'passenger1@bustracking.com',
    role: 'passenger',
    full_name: 'Alice Passenger',
    is_verified: true,
  },
  {
    username: 'passenger2',
    password: 'passenger123',
    email: 'passenger2@bustracking.com',
    role: 'passenger',
    full_name: 'Bob Passenger',
    is_verified: true,
  },
];

async function createTestUsers() {
  try {
    logger.info('Creating test users...');

    // First, create test vehicles if they don't exist
    const vehicles = [
      { vehicle_id: 'BUS001', route_id: null, vehicle_type: 'Standard Bus', capacity: 50 },
      { vehicle_id: 'BUS002', route_id: null, vehicle_type: 'Standard Bus', capacity: 50 },
    ];

    for (const vehicle of vehicles) {
      try {
        await db.query(
          `INSERT INTO vehicles (vehicle_id, route_id, vehicle_type, capacity, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT (vehicle_id) DO NOTHING`,
          [vehicle.vehicle_id, vehicle.route_id, vehicle.vehicle_type, vehicle.capacity]
        );
        logger.info(`✓ Vehicle ${vehicle.vehicle_id} ready`);
      } catch (error: any) {
        if (error.code !== '23505') { // Ignore duplicate key errors
          logger.warn(`Could not create vehicle ${vehicle.vehicle_id}: ${error.message}`);
        }
      }
    }

    // Create test users
    for (const user of testUsers) {
      try {
        const passwordHash = await bcrypt.hash(user.password, 10);

        // Check if user already exists
        const existing = await db.query(
          'SELECT id FROM users WHERE username = $1',
          [user.username]
        );

        if (existing.rows.length > 0) {
          // Update existing user
          await db.query(
            `UPDATE users
             SET password_hash = $1,
                 email = $2,
                 role = $3,
                 full_name = $4,
                 vehicle_id = $5,
                 is_verified = $6,
                 is_active = TRUE
             WHERE username = $7`,
            [
              passwordHash,
              user.email,
              user.role,
              user.full_name,
              user.vehicle_id || null,
              user.is_verified,
              user.username,
            ]
          );
          logger.info(`✓ Updated user: ${user.username} (${user.role})`);
        } else {
          // Create new user
          await db.query(
            `INSERT INTO users (username, password_hash, email, role, full_name, vehicle_id, is_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
            [
              user.username,
              passwordHash,
              user.email,
              user.role,
              user.full_name,
              user.vehicle_id || null,
              user.is_verified,
            ]
          );
          logger.info(`✓ Created user: ${user.username} (${user.role})`);
        }
      } catch (error: any) {
        logger.error(`Failed to create user ${user.username}:`, error.message);
      }
    }

    logger.info('\n✅ Test users created successfully!');
    logger.info('\n📋 Test Credentials:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('ADMIN:');
    logger.info('  Username: admin');
    logger.info('  Password: admin123');
    logger.info('');
    logger.info('DRIVERS:');
    logger.info('  Username: driver1  | Password: driver123');
    logger.info('  Username: driver2  | Password: driver123');
    logger.info('');
    logger.info('PASSENGERS:');
    logger.info('  Username: passenger1 | Password: passenger123');
    logger.info('  Username: passenger2 | Password: passenger123');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    logger.error('Error creating test users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { createTestUsers, testUsers };


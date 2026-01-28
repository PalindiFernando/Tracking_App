# Test Credentials & User Guide

This document provides test credentials for all user roles and explains what each role can access.

## Test Users

### 🔴 Admin User
**Username:** `admin`  
**Password:** `admin123`  
**Email:** admin@bustracking.com  
**Role:** Admin

**Access:**
- ✅ Full admin dashboard (`/admin`)
- ✅ Bus Management (Create, Read, Update, Delete)
- ✅ Route Management (Create, Read, Update, Delete, Manage Stop Sequences)
- ✅ User Management (Verify drivers, activate/deactivate users, assign vehicles)
- ✅ View all system data

**API Endpoints:**
- `/api/admin/buses` - Bus CRUD operations
- `/api/admin/routes` - Route CRUD operations
- `/api/admin/users` - User management operations

---

### 🟦 Driver Users

#### Driver 1
**Username:** `driver1`  
**Password:** `driver123`  
**Email:** driver1@bustracking.com  
**Role:** Driver  
**Assigned Vehicle:** BUS001

#### Driver 2
**Username:** `driver2`  
**Password:** `driver123`  
**Email:** driver2@bustracking.com  
**Role:** Driver  
**Assigned Vehicle:** BUS002

**Access:**
- ✅ Driver dashboard (`/driver`)
- ✅ Start/Stop trips
- ✅ Update status (Running, Delayed, Break, Maintenance)
- ✅ Real-time GPS location broadcasting
- ✅ View notifications/alerts
- ✅ View current trip information

**API Endpoints:**
- `POST /api/driver/trip/start` - Start a new trip
- `POST /api/driver/trip/stop` - Stop current trip
- `GET /api/driver/trip/current` - Get current active trip
- `PUT /api/driver/status` - Update driver status
- `POST /api/driver/location` - Broadcast GPS location
- `GET /api/driver/notifications` - Get notifications

**Features:**
- Can only access driver-specific endpoints
- Must have a vehicle assigned to start trips
- GPS tracking can be enabled/disabled from dashboard

---

### 🟢 Passenger Users

#### Passenger 1
**Username:** `passenger1`  
**Password:** `passenger123`  
**Email:** passenger1@bustracking.com  
**Role:** Passenger

#### Passenger 2
**Username:** `passenger2`  
**Password:** `passenger123`  
**Email:** passenger2@bustracking.com  
**Role:** Passenger

**Access:**
- ✅ Passenger route search (`/passenger/search`)
- ✅ Real-time bus tracking (`/passenger/route/:routeId`)
- ✅ ML-based ETA predictions
- ✅ Alternative route suggestions when delayed
- ✅ Favorite routes/stops/buses
- ✅ Notifications for approaching buses and delays

**API Endpoints:**
- `GET /api/passenger/routes/search?q=<query>` - Search routes
- `GET /api/passenger/buses/:routeId` - Get buses for a route
- `GET /api/passenger/bus/:vehicleId/track` - Track specific bus
- `GET /api/passenger/eta/:vehicleId/:stopId` - Get ETA prediction
- `GET /api/passenger/alternatives/:routeId/:stopId` - Get alternative routes
- `POST /api/passenger/favorites` - Add favorite
- `GET /api/passenger/favorites` - Get favorites
- `GET /api/passenger/notifications` - Get notifications

**Features:**
- Can search and track buses without authentication (optional auth)
- Full features require authentication (favorites, notifications)
- Receives smart recommendations when routes are delayed

---

## Creating Test Users

### Option 1: Run the script directly
```bash
cd backend
npm run create-test-users
```

### Option 1: During migration (automatic)
```bash
cd backend
CREATE_TEST_USERS=true npm run migrate
```

### Option 2: Via API (Registration)
```bash
# Register a passenger
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passenger1",
    "password": "passenger123",
    "email": "passenger1@example.com",
    "role": "passenger",
    "full_name": "Test Passenger"
  }'

# Register a driver
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "driver1",
    "password": "driver123",
    "email": "driver1@example.com",
    "role": "driver",
    "full_name": "Test Driver"
  }'
```

**Note:** Admin users cannot be created via registration API. Use the script or SQL directly.

---

## Testing Workflows

### Admin Workflow
1. Login as `admin` / `admin123`
2. Navigate to `/admin`
3. **Bus Management:**
   - Create a new bus (e.g., BUS003)
   - Assign it to a route
   - Update bus status
4. **Route Management:**
   - Create a new route
   - Add stops in sequence
   - Update route details
5. **User Management:**
   - Verify driver accounts
   - Assign vehicles to drivers
   - Activate/deactivate users

### Driver Workflow
1. Login as `driver1` / `driver123`
2. Navigate to `/driver`
3. **Start Trip:**
   - Click "Start Trip"
   - Enable GPS Location Broadcasting
   - Update status if delayed
4. **During Trip:**
   - Location is automatically broadcasted
   - Update status (Delayed, Break, etc.)
   - View notifications
5. **End Trip:**
   - Click "Stop Trip"

### Passenger Workflow
1. (Optional) Login as `passenger1` / `passenger123`
2. Navigate to `/passenger/search`
3. **Search Routes:**
   - Search by route number or name
   - Select a route
4. **Track Bus:**
   - View real-time bus position
   - Select a stop to get ETA
   - View ML-based ETA predictions
5. **Get Alternatives:**
   - If route is delayed, see alternative suggestions
6. **Favorites:**
   - Add routes/stops to favorites (requires login)
   - Receive notifications for favorite routes

---

## API Testing Examples

### Admin - Create Bus
```bash
curl -X POST http://localhost:3001/api/admin/buses \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "BUS003",
    "route_id": "R001",
    "vehicle_type": "Standard Bus",
    "capacity": 50,
    "status": "active"
  }'
```

### Driver - Start Trip
```bash
curl -X POST http://localhost:3001/api/driver/trip/start \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "R001"
  }'
```

### Driver - Update Location
```bash
curl -X POST http://localhost:3001/api/driver/location \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 45,
    "heading": 90,
    "accuracy": 10
  }'
```

### Passenger - Search Routes
```bash
curl "http://localhost:3001/api/passenger/routes/search?q=101"
```

### Passenger - Get ETA
```bash
curl "http://localhost:3001/api/passenger/eta/BUS001/STOP001" \
  -H "Authorization: Bearer <passenger_token>"
```

---

## Security Notes

⚠️ **Important:** These are test credentials for development only!

- Change all passwords in production
- Use strong, unique passwords
- Enable proper authentication mechanisms
- Implement rate limiting
- Use HTTPS in production
- Regularly rotate JWT secrets

---

## Troubleshooting

### User not found
- Run `npm run create-test-users` to create test users
- Check database connection
- Verify users table exists

### Authentication fails
- Check JWT_SECRET in `.env` file
- Verify password hash is correct
- Check user is_active status

### Permission denied
- Verify user role matches required role
- Check middleware authentication
- Ensure token is valid and not expired

---

## Quick Reference

| Role | Username | Password | Dashboard | Key Features |
|------|----------|----------|-----------|--------------|
| Admin | `admin` | `admin123` | `/admin` | Full system management |
| Driver | `driver1` | `driver123` | `/driver` | Trip management, GPS tracking |
| Driver | `driver2` | `driver123` | `/driver` | Trip management, GPS tracking |
| Passenger | `passenger1` | `passenger123` | `/passenger/search` | Route tracking, ETA |
| Passenger | `passenger2` | `passenger123` | `/passenger/search` | Route tracking, ETA |


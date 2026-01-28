# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ installed and running
- Redis 7+ installed and running
- Google Maps Platform API key with Directions API and Distance Matrix API enabled

## Local Development Setup

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install and start PostgreSQL service

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

### 2. Install Redis

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use WSL2

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE bustracking;
CREATE USER bustrack WITH PASSWORD 'bustrack123';
GRANT ALL PRIVILEGES ON DATABASE bustracking TO bustrack;
\q
```

### 4. Clone and Setup

```bash
git clone <repository-url>
cd bus-tracking-system
```

### 5. Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
cd ..
```

### 6. Environment Configuration

**Backend** - Create `backend/.env`:
```env
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USER=bustrack
DB_PASSWORD=bustrack123
DB_NAME=bustracking

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
API_KEY_SECRET=your-device-api-key-secret

GOOGLE_API_KEY=your-google-maps-api-key
GOOGLE_DIRECTIONS_API_URL=https://maps.googleapis.com/maps/api/directions/json
GOOGLE_DISTANCE_MATRIX_API_URL=https://maps.googleapis.com/maps/api/distancematrix/json

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

ETA_CACHE_TTL_SECONDS=30
ETA_SAFETY_BUFFER_MINUTES=1

LOG_LEVEL=info
```

**Frontend** - Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_WS_URL=localhost:3001
```

### 7. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 8. Start Backend

```bash
cd backend
npm run dev
```

Backend will start on http://localhost:3001

### 9. Start Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:5173

### 10. Verify Installation

- Health Check: `curl http://localhost:3001/health`
- Frontend: Open http://localhost:5173 in browser

## Import GTFS Data

To import route and stop data from GTFS files:

1. Download GTFS feed from your transit agency
2. Use GTFS import tools or scripts to populate the database
3. Required files: routes.txt, stops.txt, trips.txt, stop_times.txt, shapes.txt

## GPS Device Integration

GPS devices should send POST requests to `/api/gps` with:

```json
{
  "vehicle_id": "BUS001",
  "timestamp": 1704067200,
  "latitude": 6.9271,
  "longitude": 79.8612,
  "speed": 45.5,
  "heading": 180
}
```

Include header: `X-API-Key: <your-api-key-secret>`

## AWS EC2 Deployment

### 1. Launch EC2 Instance

- Instance type: t3.micro (free tier eligible)
- OS: Ubuntu 22.04 LTS
- Security groups: Allow ports 80, 443, 3001, 5432, 6379, 22

### 2. Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### 3. Configure PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE bustracking;
CREATE USER bustrack WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE bustracking TO bustrack;
\q

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Configure Redis

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
```

### 5. Clone and Setup Application

```bash
# Clone repository
git clone <repository-url>
cd bus-tracking-system

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 6. Configure Environment

Create `backend/.env` and `frontend/.env` with production values (see step 6 in Local Setup).

### 7. Build and Run

```bash
# Build backend
cd backend
npm run build
npm run migrate

# Build frontend
cd ../frontend
npm run build
cd ..
```

### 8. Start with PM2

```bash
# Start backend
cd backend
pm2 start dist/server.js --name bus-tracking-backend
pm2 save
pm2 startup

# Start frontend (using serve or nginx)
cd ../frontend
sudo npm install -g serve
serve -s dist -l 5173
```

### 9. Configure Nginx (Optional)

Create `/etc/nginx/sites-available/bus-tracking`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/bus-tracking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoring

- Backend logs: `pm2 logs bus-tracking-backend`
- Health check: `curl http://localhost:3001/health`
- Database status: `psql -U bustrack -d bustracking -c "SELECT 1;"`
- Redis status: `redis-cli ping`
- Check processes: `pm2 status`

## Troubleshooting

### Backend won't start
- Check database connection
- Verify Redis is running
- Check environment variables

### Frontend can't connect to backend
- Verify `VITE_API_URL` in frontend .env
- Check CORS settings in backend
- Verify backend is running

### Google API errors
- Verify API key is correct
- Check API quotas and billing
- Ensure Directions API and Distance Matrix API are enabled


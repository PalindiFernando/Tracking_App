# Quick Setup Guide (No Docker)

## Step-by-Step Setup

### 1. Install Prerequisites

**PostgreSQL:**
```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS:
brew install postgresql@15
brew services start postgresql@15

# Linux:
sudo apt install postgresql-15
sudo systemctl start postgresql
```

**Redis:**
```bash
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# macOS:
brew install redis
brew services start redis

# Linux:
sudo apt install redis-server
sudo systemctl start redis
```

### 2. Create Database

```bash
psql -U postgres
CREATE DATABASE bustracking;
CREATE USER bustrack WITH PASSWORD 'bustrack123';
GRANT ALL PRIVILEGES ON DATABASE bustracking TO bustrack;
\q
```

### 3. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
cd ..
```

### 4. Configure Environment

**Backend `.env` file** (`backend/.env`):
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
JWT_SECRET=change-this-secret
API_KEY_SECRET=change-this-api-key
GOOGLE_API_KEY=your-google-api-key-here
```

**Frontend `.env` file** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=your-google-api-key-here
VITE_WS_URL=localhost:3001
```

### 5. Run Migrations

```bash
cd backend
npm run migrate
```

### 6. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 7. Access Application

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

## Troubleshooting

**PostgreSQL not running:**
```bash
# Check status
sudo systemctl status postgresql  # Linux
brew services list                # macOS

# Start service
sudo systemctl start postgresql   # Linux
brew services start postgresql@15 # macOS
```

**Redis not running:**
```bash
# Check status
redis-cli ping  # Should return "PONG"

# Start service
sudo systemctl start redis-server  # Linux
brew services start redis          # macOS
```

**Database connection error:**
- Verify PostgreSQL is running
- Check username/password in `.env`
- Verify database exists: `psql -U bustrack -d bustracking -c "SELECT 1;"`

**Redis connection error:**
- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in `.env`


# Real-Time Bus Tracking and ETA System

A comprehensive bus tracking system that provides real-time bus positions and accurate ETAs using Google Maps APIs.

## Features

- **Real-Time GPS Tracking**: Receive and process GPS updates from bus tracking devices
- **Traffic-Aware ETAs**: Calculate accurate arrival times using Google Directions/Distance Matrix APIs
- **Rider Application**: Web and mobile-friendly interface for commuters
- **Operator Dashboard**: Fleet monitoring and management tools
- **Real-Time Updates**: WebSocket-based live updates for positions and ETAs
- **Cost-Effective**: Optimized caching to minimize API costs
- **Scalable Architecture**: Microservices-based design suitable for AWS EC2 free tier

## Architecture

- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with Vite
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for real-time data
- **APIs**: Google Directions API, Distance Matrix API
- **Deployment**: Manual setup, optimized for AWS EC2 free tier

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (installed and running)
- Redis 7+ (installed and running)
- Google Maps Platform API key (with Directions API and Distance Matrix API enabled)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bus-tracking-system
   ```

2. Install dependencies:
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

3. Set up PostgreSQL database:
   ```bash
   # Create database
   createdb bustracking
   # Or using psql:
   psql -U postgres -c "CREATE DATABASE bustracking;"
   ```

4. Configure environment variables:

   **Backend** - Create `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=3001
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your-postgres-password
   DB_NAME=bustracking
   
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   JWT_SECRET=your-secret-key-change-in-production
   API_KEY_SECRET=your-device-api-key-secret
   
   GOOGLE_API_KEY=your-google-maps-api-key
   ```

   **Frontend** - Create `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   VITE_WS_URL=localhost:3001
   ```

5. Run database migrations:
   ```bash
   cd backend
   npm run migrate
   ```

6. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on http://localhost:3001

7. Start the frontend (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:5173

8. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── services/      # Business logic (GPS, ETA, Route Mapping)
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, error handling, rate limiting
│   │   ├── database/       # Database connection and migrations
│   │   ├── cache/          # Redis caching
│   │   ├── websocket/      # WebSocket server
│   │   └── utils/          # Utilities (logger, etc.)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API and WebSocket clients
│   │   └── store/          # State management
│   ├── Dockerfile
│   └── package.json
├── DEPLOYMENT.md           # Deployment guide
├── API_DOCUMENTATION.md    # API reference
└── README.md
```

## Development

### Quick Start Scripts

**Windows:**
```bash
# Terminal 1 - Backend
start-backend.bat

# Terminal 2 - Frontend
start-frontend.bat
```

**Linux/macOS:**
```bash
# Make scripts executable
chmod +x start-backend.sh start-frontend.sh

# Terminal 1 - Backend
./start-backend.sh

# Terminal 2 - Frontend
./start-frontend.sh
```

### Manual Start

**Backend:**
```bash
cd backend
npm run migrate  # Run migrations first
npm run dev      # Start with hot reload
```

**Frontend:**
```bash
cd frontend
npm run dev      # Start dev server
```

### Other Commands

```bash
# Backend
cd backend
npm test     # Run tests
npm run lint # Lint code
npm run build # Build for production

# Frontend
cd frontend
npm run build    # Build for production
npm run preview  # Preview production build
```

## Google Maps API Setup

**Important:** You need a Google Maps Platform API key for ETA calculations.

See [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md) for detailed step-by-step instructions on:
- Creating a Google Cloud project
- Enabling required APIs (Directions, Distance Matrix, Maps JavaScript)
- Setting up billing and API keys
- Configuring security restrictions
- Cost optimization tips

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including AWS EC2 setup.

## GPS Device Integration

GPS devices should POST to `/api/gps` with:
- Header: `X-API-Key: <your-api-key-secret>`
- Body: JSON with vehicle_id, timestamp, latitude, longitude, speed, heading

## GTFS Data Import

Import route and stop data from GTFS feeds:
1. Download GTFS feed from transit agency
2. Import routes.txt, stops.txt, trips.txt, stop_times.txt, shapes.txt
3. Use database import scripts or GTFS tools

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## License

MIT License


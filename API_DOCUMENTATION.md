# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

### GPS Device Authentication
Include `X-API-Key` header with device API key secret.

### Operator Authentication
Include `Authorization: Bearer <token>` header with JWT token from `/api/auth/login`.

## Endpoints

### GPS Ingestion

#### POST /api/gps
Receive GPS update from bus tracking device.

**Headers:**
```
X-API-Key: <device-api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "vehicle_id": "BUS001",
  "timestamp": 1704067200,
  "latitude": 6.9271,
  "longitude": 79.8612,
  "speed": 45.5,
  "heading": 180,
  "accuracy": 10.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "GPS update received",
  "vehicle_id": "BUS001"
}
```

### Buses

#### GET /api/buses
Get all active buses.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vehicle_id": "BUS001",
      "position": {
        "latitude": 6.9271,
        "longitude": 79.8612,
        "timestamp": "2024-01-01T12:00:00Z",
        "speed": 45.5
      },
      "route": {
        "route_id": "R001",
        "route_short_name": "101"
      }
    }
  ]
}
```

#### GET /api/buses/:vehicleId
Get specific bus details.

### Stops

#### GET /api/stops?q=<query>&limit=<limit>
Search stops by name or code.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "stop_id": "S001",
      "stop_name": "Central Station",
      "stop_lat": 6.9271,
      "stop_lon": 79.8612,
      "stop_code": "CS001"
    }
  ]
}
```

#### GET /api/stops/:stopId
Get stop details.

#### GET /api/stops/:stopId/eta
Get ETAs for all buses approaching a stop.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vehicle_id": "BUS001",
      "stop_id": "S001",
      "route_id": "R001",
      "eta_minutes": 5,
      "eta_timestamp": "2024-01-01T12:05:00Z",
      "confidence": "high",
      "cached": false
    }
  ]
}
```

### Routes

#### GET /api/routes
Get all routes.

#### GET /api/routes/:routeId
Get route details.

#### GET /api/routes/:routeId/stops?direction=<inbound|outbound>
Get stops for a route.

### ETA

#### GET /api/eta/:vehicleId/:stopId
Get ETA for specific vehicle to stop.

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicle_id": "BUS001",
    "stop_id": "S001",
    "route_id": "R001",
    "eta_minutes": 5,
    "eta_timestamp": "2024-01-01T12:05:00Z",
    "confidence": "high",
    "cached": false
  }
}
```

#### POST /api/eta/batch
Calculate ETAs for multiple vehicle-stop pairs.

**Request Body:**
```json
{
  "requests": [
    { "vehicle_id": "BUS001", "stop_id": "S001" },
    { "vehicle_id": "BUS002", "stop_id": "S002" }
  ]
}
```

### Authentication

#### POST /api/auth/login
Operator login.

**Request Body:**
```json
{
  "username": "operator",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "username": "operator",
      "role": "operator"
    }
  }
}
```

#### GET /api/auth/verify
Verify JWT token.

## WebSocket

### Connection

```
ws://localhost:3001/ws
```

### Messages

#### Subscribe to Topics
```json
{
  "type": "subscribe",
  "topics": ["route:R001", "stop:S001"]
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe",
  "topics": ["route:R001"]
}
```

### Received Messages

#### Position Update
```json
{
  "type": "position_update",
  "data": {
    "vehicle_id": "BUS001",
    "latitude": 6.9271,
    "longitude": 79.8612,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### ETA Update
```json
{
  "type": "eta_update",
  "data": {
    "vehicle_id": "BUS001",
    "stop_id": "S001",
    "eta_minutes": 5
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error


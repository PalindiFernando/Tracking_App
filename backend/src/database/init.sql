-- Bus Tracking System Database Schema

-- Bus Positions Table
CREATE TABLE IF NOT EXISTS bus_positions (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    accuracy DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_bus_positions_vehicle_id ON bus_positions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bus_positions_timestamp ON bus_positions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bus_positions_location ON bus_positions(latitude, longitude);

-- Routes Table (GTFS routes.txt)
CREATE TABLE IF NOT EXISTS routes (
    route_id VARCHAR(50) PRIMARY KEY,
    agency_id VARCHAR(50),
    route_short_name VARCHAR(50),
    route_long_name VARCHAR(255),
    route_desc TEXT,
    route_type INTEGER,
    route_url VARCHAR(255),
    route_color VARCHAR(6),
    route_text_color VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes(route_short_name);

-- Stops Table (GTFS stops.txt)
CREATE TABLE IF NOT EXISTS stops (
    stop_id VARCHAR(50) PRIMARY KEY,
    stop_code VARCHAR(50),
    stop_name VARCHAR(255) NOT NULL,
    stop_desc TEXT,
    stop_lat DECIMAL(10, 8) NOT NULL,
    stop_lon DECIMAL(11, 8) NOT NULL,
    zone_id VARCHAR(50),
    stop_url VARCHAR(255),
    location_type INTEGER DEFAULT 0,
    parent_station VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stops_name ON stops(stop_name);
CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(stop_lat, stop_lon);

-- Shapes Table (GTFS shapes.txt) - for route polylines
CREATE TABLE IF NOT EXISTS shapes (
    shape_id VARCHAR(50),
    shape_pt_lat DECIMAL(10, 8) NOT NULL,
    shape_pt_lon DECIMAL(11, 8) NOT NULL,
    shape_pt_sequence INTEGER NOT NULL,
    shape_dist_traveled DECIMAL(10, 2),
    route_id VARCHAR(50),
    PRIMARY KEY (shape_id, shape_pt_sequence)
);

CREATE INDEX IF NOT EXISTS idx_shapes_route_id ON shapes(route_id);
CREATE INDEX IF NOT EXISTS idx_shapes_location ON shapes(shape_pt_lat, shape_pt_lon);

-- Trips Table (GTFS trips.txt)
CREATE TABLE IF NOT EXISTS trips (
    trip_id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50) NOT NULL,
    service_id VARCHAR(50),
    trip_headsign VARCHAR(255),
    trip_short_name VARCHAR(50),
    direction_id INTEGER,
    block_id VARCHAR(50),
    shape_id VARCHAR(50),
    wheelchair_accessible INTEGER,
    bikes_allowed INTEGER,
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);

-- Stop Times Table (GTFS stop_times.txt)
CREATE TABLE IF NOT EXISTS stop_times (
    trip_id VARCHAR(50) NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    stop_id VARCHAR(50) NOT NULL,
    stop_sequence INTEGER NOT NULL,
    stop_headsign VARCHAR(255),
    pickup_type INTEGER DEFAULT 0,
    drop_off_type INTEGER DEFAULT 0,
    shape_dist_traveled DECIMAL(10, 2),
    timepoint INTEGER DEFAULT 1,
    PRIMARY KEY (trip_id, stop_sequence),
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

CREATE INDEX IF NOT EXISTS idx_stop_times_trip_id ON stop_times(trip_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_stop_id ON stop_times(stop_id);

-- Vehicles Table (tracking system vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50),
    vehicle_type VARCHAR(50),
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_route_id ON vehicles(route_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- ETA Cache Table (optional - for historical ETA data)
CREATE TABLE IF NOT EXISTS eta_history (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL,
    stop_id VARCHAR(50) NOT NULL,
    route_id VARCHAR(50),
    predicted_eta TIMESTAMP NOT NULL,
    actual_arrival TIMESTAMP,
    eta_minutes INTEGER,
    confidence VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

CREATE INDEX IF NOT EXISTS idx_eta_history_vehicle_stop ON eta_history(vehicle_id, stop_id);
CREATE INDEX IF NOT EXISTS idx_eta_history_created_at ON eta_history(created_at DESC);

-- Users Table (replaces operators - supports multiple roles)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
    full_name VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    vehicle_id VARCHAR(50), -- For drivers, links to their assigned vehicle
    push_token TEXT, -- For push notifications
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_vehicle_id ON users(vehicle_id);

-- Operators Table (for backward compatibility - deprecated)
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operators_username ON operators(username);

-- Driver Trips Table (for trip management)
CREATE TABLE IF NOT EXISTS driver_trips (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    route_id VARCHAR(50),
    trip_status VARCHAR(20) NOT NULL CHECK (trip_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_start_time TIMESTAMP,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    current_status VARCHAR(20) DEFAULT 'running' CHECK (current_status IN ('running', 'delayed', 'break', 'maintenance')),
    delay_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_trips_driver_id ON driver_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_trips_vehicle_id ON driver_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_trips_status ON driver_trips(trip_status);
CREATE INDEX IF NOT EXISTS idx_driver_trips_route_id ON driver_trips(route_id);

-- Route Stop Sequence Table (for managing stop order in routes)
CREATE TABLE IF NOT EXISTS route_stop_sequence (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(50) NOT NULL,
    stop_id VARCHAR(50) NOT NULL,
    sequence_order INTEGER NOT NULL,
    direction_id INTEGER DEFAULT 0,
    estimated_time_minutes INTEGER, -- Estimated time from previous stop
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, stop_id, direction_id, sequence_order),
    FOREIGN KEY (route_id) REFERENCES routes(route_id),
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stop_sequence_route ON route_stop_sequence(route_id, direction_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_route_stop_sequence_stop ON route_stop_sequence(stop_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    notification_type VARCHAR(50) NOT NULL, -- 'bus_approaching', 'delay_alert', 'route_suggestion', 'system_alert'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data (vehicle_id, route_id, stop_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Passenger Favorites Table (for tracking favorite routes/stops)
CREATE TABLE IF NOT EXISTS passenger_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    favorite_type VARCHAR(20) NOT NULL CHECK (favorite_type IN ('route', 'stop', 'bus')),
    favorite_id VARCHAR(50) NOT NULL, -- route_id, stop_id, or vehicle_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, favorite_type, favorite_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_passenger_favorites_user_id ON passenger_favorites(user_id);

-- ML ETA Training Data Table (for storing historical ETA data for ML model)
CREATE TABLE IF NOT EXISTS ml_eta_training_data (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL,
    route_id VARCHAR(50),
    stop_id VARCHAR(50) NOT NULL,
    predicted_eta_minutes INTEGER NOT NULL,
    actual_arrival_minutes INTEGER,
    traffic_condition VARCHAR(20), -- 'light', 'moderate', 'heavy'
    weather_condition VARCHAR(20), -- 'clear', 'rain', 'snow', etc.
    day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
    hour_of_day INTEGER, -- 0-23
    distance_km DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_eta_vehicle_stop ON ml_eta_training_data(vehicle_id, stop_id);
CREATE INDEX IF NOT EXISTS idx_ml_eta_created_at ON ml_eta_training_data(created_at DESC);


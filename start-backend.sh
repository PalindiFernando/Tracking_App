#!/bin/bash

echo "Starting Bus Tracking Backend..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first."
    exit 1
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env file not found. Please create it first."
    exit 1
fi

cd backend

# Run migrations
echo "Running database migrations..."
npm run migrate

# Start backend
echo "Starting backend server..."
npm run dev


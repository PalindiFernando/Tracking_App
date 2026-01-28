#!/bin/bash

echo "Starting Bus Tracking Frontend..."

# Check if .env exists
if [ ! -f "frontend/.env" ]; then
    echo "❌ frontend/.env file not found. Please create it first."
    exit 1
fi

cd frontend

# Start frontend
echo "Starting frontend server..."
npm run dev


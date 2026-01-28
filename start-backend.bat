@echo off
echo Starting Bus Tracking Backend...

cd backend

REM Check if .env exists
if not exist ".env" (
    echo ERROR: backend\.env file not found. Please create it first.
    exit /b 1
)

REM Run migrations
echo Running database migrations...
call npm run migrate

REM Start backend
echo Starting backend server...
call npm run dev


@echo off
echo Starting Bus Tracking Frontend...

cd frontend

REM Check if .env exists
if not exist ".env" (
    echo ERROR: frontend\.env file not found. Please create it first.
    exit /b 1
)

REM Start frontend
echo Starting frontend server...
call npm run dev


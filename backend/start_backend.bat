@echo off
echo Starting Backend Server...
echo.

if not exist venv\Scripts\python.exe (
    echo ERROR: Virtual environment not found!
    echo Please run setup_backend.bat first
    pause
    exit /b 1
)

echo Backend will run on: http://localhost:8000
echo Press Ctrl+C to stop
echo.

venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

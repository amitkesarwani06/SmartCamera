@echo off
echo Starting Frontend Server...
echo.

if not exist node_modules (
    echo ERROR: Dependencies not installed!
    echo Running npm install...
    call npm install
)

echo Frontend will run on: http://localhost:5173
echo Press Ctrl+C to stop
echo.

call npm run dev

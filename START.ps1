# SmartCamera - Quick Start Script
# Double-click this file to start both servers

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  SmartCamera Quick Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend exists
if (-not (Test-Path "backend\venv\Scripts\python.exe")) {
    Write-Host "ERROR: Backend virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup first." -ForegroundColor Yellow
    pause
    exit
}

# Check if frontend node_modules exists
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "ERROR: Frontend dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run: cd frontend && npm install" -ForegroundColor Yellow
    pause
    exit
}

# Start Backend
Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "cd '$PSScriptRoot\backend'; .\venv\Scripts\activate; Write-Host 'Backend Server Running on http://localhost:8000' -ForegroundColor Green; uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[2/2] Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend Server Running on http://localhost:5173' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  Servers are starting!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Open browser
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "✓ Browser opened!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

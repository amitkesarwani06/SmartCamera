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

# Start MediaMTX (Docker RTSP Server)
Write-Host "[1/3] Starting MediaMTX RTSP Server (Docker)..." -ForegroundColor Magenta
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "       MediaMTX running at rtsp://localhost:8554/sample" -ForegroundColor Green
}
else {
    Write-Host "       WARNING: Docker may not be running. MediaMTX skipped." -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Start Backend (using explicit venv Python path — always loads Pillow correctly)
Write-Host "[2/3] Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "cd '$PSScriptRoot\backend'; Write-Host 'Backend Server Running on http://localhost:8000' -ForegroundColor Green; .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[3/3] Starting Frontend Server..." -ForegroundColor Cyan
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

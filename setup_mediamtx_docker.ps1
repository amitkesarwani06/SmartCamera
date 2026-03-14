# MediaMTX Docker Setup Script for Windows
# Run this script once to prepare the Docker-based MediaMTX environment.

$VideoDir = "$PSScriptRoot\mediamtx\videos"

Write-Host "--- MediaMTX Docker Setup ---" -ForegroundColor Cyan

# 1. Create the videos directory for stream sources
Write-Host "`nCreating videos directory at: $VideoDir" -ForegroundColor Yellow
if (-not (Test-Path $VideoDir)) {
    New-Item -ItemType Directory -Path $VideoDir -Force | Out-Null
    Write-Host "  Created: $VideoDir" -ForegroundColor Green
}
else {
    Write-Host "  Already exists: $VideoDir" -ForegroundColor Gray
}

# 2. Check Docker is installed and running
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon is not running." }
    Write-Host "  Docker is running." -ForegroundColor Green
}
catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop and ensure it is running." -ForegroundColor Red
    exit 1
}

# 3. Remind user to place a sample video
Write-Host "`n[ACTION REQUIRED]" -ForegroundColor Magenta
Write-Host "  Place a video file named 'sample.mp4' inside:" -ForegroundColor White
Write-Host "  $VideoDir" -ForegroundColor Cyan
Write-Host "  This file will be streamed at rtsp://localhost:8554/sample" -ForegroundColor Gray

# 4. Pull the MediaMTX Docker image
Write-Host "`nPulling MediaMTX Docker image (bluenviron/mediamtx:latest)..." -ForegroundColor Yellow
docker pull bluenviron/mediamtx:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to pull Docker image." -ForegroundColor Red
    exit 1
}
Write-Host "  Image pulled successfully." -ForegroundColor Green

Write-Host "`n--- Setup Complete! ---" -ForegroundColor Cyan
Write-Host "To START MediaMTX:  " -NoNewline; Write-Host "docker compose up -d" -ForegroundColor Green
Write-Host "To STOP  MediaMTX:  " -NoNewline; Write-Host "docker compose down" -ForegroundColor Yellow
Write-Host "To VIEW  logs:      " -NoNewline; Write-Host "docker compose logs -f mediamtx" -ForegroundColor Gray
Write-Host ""

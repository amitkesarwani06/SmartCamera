@echo off
echo ================================
echo   SmartCamera Backend Setup
echo ================================
echo.

echo [1/3] Removing old virtual environment...
if exist venv rmdir /s /q venv
echo Done.

echo.
echo [2/3] Creating new virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    echo Please make sure Python is installed and in PATH
    pause
    exit /b 1
)
echo Done.

echo.
echo [3/3] Installing dependencies...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ================================
echo   Setup Complete!
echo ================================
echo.
echo You can now start the backend with:
echo   venv\Scripts\activate
echo   uvicorn main:app --reload --port 8000
echo.
pause

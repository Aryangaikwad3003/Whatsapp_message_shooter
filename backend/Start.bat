@echo off
echo ==========================================
echo    WhatsApp Broadcast Tool Launcher
echo ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install it from https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check if dependencies need to be installed
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing required files. This may take a minute...
    npm install
)

echo [INFO] Launching your web browser...
start http://localhost:3005

echo [INFO] Starting the server... Keep this black window open!
echo.
npm start

pause

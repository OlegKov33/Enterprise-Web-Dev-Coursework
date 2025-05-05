@echo off
:: Batch file to run 'node server.js' with basic checks

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Download Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if server.js exists
if not exist "server.js" (
    echo Error: "server.js" not found in current directory.
    pause
    exit /b 1
)

echo Starting Node.js server...
node server.js

:: Pause to see output if running by double-clicking
pause
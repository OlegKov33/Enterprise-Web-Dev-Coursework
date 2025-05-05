@echo off

:: Create package.json if it doesn't exist
if not exist package.json (
    echo Creating package.json with type module...
    (
    echo {
    echo   "type": "module",
    echo   "dependencies": {
    echo     "@supabase/supabase-js": "^2.48.1",
    echo     "access": "^1.0.2",
    echo     "bcrypt": "^5.1.1",
    echo     "cookie-parser": "^1.4.7",
    echo     "crypto": "^1.0.1",
    echo     "dotenv": "^16.4.7",
    echo     "express": "^4.21.2",
    echo     "jsonwebtoken": "^9.0.2",
    echo     "node.js": "^0.0.1-security"
    echo   }
    echo }
    ) > package.json
)

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo npm is not installed. Please install npm first.
    exit /b 1
)

:: Install packages
echo Installing npm packages...
echo y | npm install

echo All packages installed successfully!
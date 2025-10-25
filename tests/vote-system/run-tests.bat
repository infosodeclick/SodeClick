@echo off
REM Vote System Tests Runner for Windows
REM This script runs all vote system tests

echo 🧪 Running SodeClick Vote System Tests...
echo ========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the tests/vote-system directory
    echo    cd tests/vote-system ^&^& run-tests.bat
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Run tests
echo.
echo 🔍 Running Vote Consistency Test...
node test-vote-consistency.js

echo.
echo 🔍 Running Premium Vote Display Test...
node test-premium-vote-display.js

echo.
echo ✅ All tests completed!
echo 📝 Check the results above for any issues
pause

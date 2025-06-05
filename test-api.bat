@echo off
REM Test script for ProSyncHub API

echo Running ProSyncHub API Tests...
echo.

REM Set environment variables for testing
set NODE_ENV=test
set JWT_SECRET=test-jwt-secret
set MONGODB_URI=mongodb://localhost:27017/prosync-hub-test
set REDIS_URL=redis://localhost:6379

echo Environment set to TEST mode
echo.

REM Run the API test client
echo Testing API endpoints...
node server/tests/api-client.js

echo.
echo Tests completed!

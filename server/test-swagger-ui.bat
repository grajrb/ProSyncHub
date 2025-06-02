@echo off
echo Starting ProSyncHub API Server...
cd /d %~dp0..
npm run dev
echo Server started. Open http://localhost:5000/api-docs to view the Swagger UI

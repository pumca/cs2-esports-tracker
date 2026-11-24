@echo off
rem CS2 Esports Tracker - egykattintasos inditas (Windows)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo A Node.js nincs telepitve. Toltsd le: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Fuggosegek telepitese...
  call npm install
)
echo Inditas: http://localhost:3000
start "" http://localhost:3000
node src/server.js
pause

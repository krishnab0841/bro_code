@echo off
echo ========================================
echo   Starting Bro Code - AI Coding Assistant
echo ========================================
echo.

echo Starting backend (FastAPI) on http://localhost:8000 ...
start "Bro Code Backend" cmd /k "cd /d %~dp0 && uvicorn backend.server:app --reload --port 8000"

echo Starting frontend (Vite + React) on http://localhost:5173 ...
start "Bro Code Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
echo   Close this window or press Ctrl+C to stop.
pause

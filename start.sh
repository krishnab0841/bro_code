#!/bin/bash
set -e

echo "========================================"
echo "  Starting Bro Code - AI Coding Assistant"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "Starting backend (FastAPI) on http://localhost:8000 ..."
uvicorn backend.server:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting frontend (Vite + React) on http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

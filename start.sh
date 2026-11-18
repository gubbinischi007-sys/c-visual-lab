#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo " Starting C Visual Lab"
echo "=========================================="

# Select Python with FastAPI & LibClang
if [ -f "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3" ]; then
    PY_BIN="/Library/Frameworks/Python.framework/Versions/3.10/bin/python3"
else
    PY_BIN="$(which python3)"
fi

echo "1. Checking backend on port 8000..."
if ! lsof -i :8000 > /dev/null 2>&1; then
    echo "Starting FastAPI backend server using $PY_BIN..."
    cd backend
    $PY_BIN -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
    cd "$DIR"
    sleep 2
else
    echo "Backend already running on port 8000."
fi

# Check Frontend dev server
echo "2. Checking frontend on port 5173..."
if ! lsof -i :5173 > /dev/null 2>&1; then
    echo "Starting Vite frontend server..."
    cd frontend
    npm run dev -- --host 0.0.0.0 --port 5173 &
    cd "$DIR"
    sleep 2
else
    echo "Frontend already running on port 5173."
fi

echo ""
echo "=========================================="
echo " C Visual Lab is Ready!"
echo " Web Application: http://localhost:5173/"
echo " Backend API Docs: http://localhost:8000/docs"
echo "=========================================="

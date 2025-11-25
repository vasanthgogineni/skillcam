#!/bin/bash

# SkillCam Development Startup Script
# This script starts both the Express server and Flask AI server

echo "🚀 Starting SkillCam Development Servers..."
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo "Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ Python dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Copy env.example to .env and configure your environment variables"
    exit 1
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  Warning: OPENAI_API_KEY not found in .env"
    echo "Add your OpenAI API key to .env for AI analysis to work"
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "Starting servers..."
echo "  - Express Server: http://localhost:5001"
echo "  - Flask AI Server: http://localhost:5002"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start Flask server in background
echo "🐍 Starting Flask AI server (port 5002)..."
python app.py &
FLASK_PID=$!

# Wait a moment for Flask to start
sleep 2

# Start Express server
echo "⚡ Starting Express server (port 5001)..."
npm run dev &
EXPRESS_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $FLASK_PID 2>/dev/null
    kill $EXPRESS_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT

# Wait for processes
wait

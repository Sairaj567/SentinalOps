#!/bin/bash
# =============================================================================
# SentinelOps - Quick Start Script (Linux/macOS)
# =============================================================================

echo "
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🛡️  SentinelOps - AI-Powered DevSecOps Security Platform       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"

echo "Starting development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Start development services
echo ""
echo "📦 Starting database services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for MongoDB
echo "⏳ Waiting for MongoDB to be ready..."
sleep 10

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Install ML engine dependencies
echo ""
echo "📦 Setting up ML engine..."
cd ../ml-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ..

echo ""
echo "
╔═══════════════════════════════════════════════════════════════════╗
║  ✅ Development environment is ready!                             ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  To start the services:                                           ║
║                                                                   ║
║  Backend:   cd backend && npm run dev                             ║
║  Frontend:  cd frontend && npm start                              ║
║  ML Engine: cd ml-engine && python app.py                         ║
║                                                                   ║
║  URLs:                                                            ║
║  - Frontend:     http://localhost:3000                            ║
║  - Backend API:  http://localhost:4000                            ║
║  - ML Engine:    http://localhost:5000                            ║
║  - MongoDB UI:   http://localhost:8081                            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"

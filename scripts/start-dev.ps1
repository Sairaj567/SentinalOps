# =============================================================================
# SentinelOps - Quick Start Scripts
# =============================================================================

# Windows PowerShell script to start the development environment

Write-Host "
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🛡️  SentinelOps - AI-Powered DevSecOps Security Platform       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "Starting development environment..." -ForegroundColor Yellow

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Start development services (MongoDB, Redis)
Write-Host "`n📦 Starting database services..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

# Wait for MongoDB to be ready
Write-Host "⏳ Waiting for MongoDB to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install

# Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install

# Install ML engine dependencies
Write-Host "`n📦 Setting up ML engine..." -ForegroundColor Yellow
Set-Location ..\ml-engine
if (-not (Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

Set-Location ..

Write-Host "`n
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
" -ForegroundColor Green

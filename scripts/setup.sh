#!/usr/bin/env bash
# /home/z/my-project/streamhub/scripts/setup.sh
#
# First-time local setup. Installs dependencies for all 3 services.
# Run from the repo root after cloning.

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "→ StreamHub local setup"
echo ""

# Check Node version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Install Node 20+ from https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v | cut -dv -f2 | cut -d. -f1)
if [[ "$NODE_VER" -lt 20 ]]; then
    echo "❌ Node 20+ required (you have $(node -v))"
    exit 1
fi
echo "✓ Node $(node -v)"

# Install dependencies for each service
echo ""
echo "→ Installing backend dependencies..."
cd backend && npm install && cd ..

echo "→ Installing CS3 bridge dependencies..."
cd cs3-bridge && npm install && cd ..

echo "→ Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Initialize database directory
mkdir -p database

# Copy .env.example if .env doesn't exist
if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example (edit to add your API keys)"
fi

# Make scripts executable
chmod +x scripts/*.sh deploy/*.sh 2>/dev/null || true

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and add API keys (TMDB at minimum — get one free at themoviedb.org)"
echo "  2. Start the dev services:"
echo "     bash /home/z/my-project/scripts/start-services.sh"
echo "     (or use docker compose -f docker-compose.dev.yml up -d --build)"
echo "  3. Open http://localhost:3000"
echo "  4. Visit /admin to set your PIN"

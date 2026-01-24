#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/5] Creating .env..."
cat > .env << 'EOF'
BSC_RPC_URLS=https://bsc-dataseed.bnbchain.org,https://bsc-dataseed1.defibit.io,https://bsc-dataseed1.ninicoin.io
HEALTH_CHECK_INTERVAL_MS=5000
RPC_TIMEOUT_MS=3000
PORT=3000
EOF

echo "[2/5] Installing dependencies..."
npm install

echo "[3/5] Building..."
npm run build

echo "[4/5] Running tests..."
npm test

echo "[5/5] Starting server..."
echo ""
echo "  → App: http://localhost:3000"
echo "  → Stop: Ctrl+C"
echo ""
set -a
# shellcheck disable=SC1091
source .env
set +a
npm start

#!/usr/bin/env bash
set -euo pipefail

# Transaction Explainer — clone-and-run script.
# Run from repo root or from this project directory.
# Pre-seeds .env for a hassle-free evaluator run.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/5] Ensuring .env..."
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "    Created .env from .env.example"
  else
    {
      echo "VITE_BSC_RPC_URL=https://bsc-dataseed.bnbchain.org"
      echo "BSC_RPC_URL=https://bsc-dataseed.bnbchain.org"
      echo "PORT=3000"
    } > .env
    echo "    Created .env with default BSC RPC and PORT"
  fi
else
  echo "    .env already exists"
fi

echo "[2/5] Installing dependencies..."
npm install

echo "[3/5] Running unit tests..."
npm test

echo "[4/5] Building..."
npm run build

echo "[5/5] Starting server..."
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a
echo "    Open http://localhost:${PORT:-3000} — use Ctrl+C to stop."
npm run server

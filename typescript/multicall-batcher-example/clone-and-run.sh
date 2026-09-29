#!/usr/bin/env bash
set -euo pipefail

# Multicall Batcher Example — clone-and-run script.
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
    echo "VITE_BSC_RPC_URL=https://bsc-dataseed.bnbchain.org" > .env
    echo "    Created .env with default BSC RPC"
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

echo "[5/5] Starting dev server..."
npm run dev

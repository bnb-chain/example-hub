#!/usr/bin/env bash
set -euo pipefail

# Run from project root (directory containing this script)
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ">> MEV Risk Meter — clone-and-run"
echo ">> Project root: $ROOT"
echo ""

echo ">> Installing dependencies..."
npm install

echo ""
echo ">> Seeding .env from .env.example..."
if [[ -f .env.example ]]; then
  cp -n .env.example .env
  echo "   .env ready. Using default BSC RPC URL."
else
  echo "BSC_RPC_URL=https://bsc-dataseed.bnbchain.org" > .env
  echo "PORT=3000" >> .env
  echo "   .env created with default BSC RPC URL."
fi

echo ""
echo ">> Building..."
npm run build

echo ""
echo ">> Running tests..."
npm test

echo ""
echo ">> Starting server..."
# Load .env so BSC_RPC_URL and PORT are available for the app
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a
echo "   Open http://localhost:${PORT:-3000} in your browser. Use Ctrl+C to stop."
npm start

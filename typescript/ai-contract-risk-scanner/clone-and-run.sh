#!/usr/bin/env bash
set -euo pipefail

# Run from project root (directory containing this script)
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ">> AI Contract Risk Scanner — clone-and-run"
echo ">> Project root: $ROOT"
echo ""

echo ">> Installing dependencies..."
npm install

echo ""
echo ">> Seeding .env from .env.example..."
if [[ -f .env.example ]]; then
  cp -n .env.example .env
  echo "   .env ready. Add your BSCTRACE_API_KEY for scanning (see https://dashboard.nodereal.io/)."
else
  echo "BSCTRACE_API_KEY=YourBsctraceApiKey" > .env
  echo "PORT=3333" >> .env
  echo "BSCTRACE_API_URL=https://bsc-mainnet.nodereal.io/v1" >> .env
  echo "   .env created. Add your BSCTRACE_API_KEY for scanning (see https://dashboard.nodereal.io/)."
fi

echo ""
echo ">> Building..."
npm run build

echo ""
echo ">> Running tests..."
npm test

echo ""
echo ">> Starting server..."
# Load .env so BSCTRACE_API_KEY and PORT are available for the app
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a
echo "   Open http://localhost:${PORT:-3333} in your browser. Use Ctrl+C to stop."
npm start

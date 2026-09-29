#!/bin/bash

# Gas Inefficiency Detector - Setup Script
# This script provides a hassle-free setup for evaluators

set -e

echo "🚀 Setting up Gas Inefficiency Detector..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with BSC RPC configuration..."
    cat > .env << EOF
# BSC RPC URL - Using public BSC endpoint
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Optional: Use a custom RPC endpoint for better performance
# BSC_RPC_URL=https://bsc-dataseed.binance.org/
# BSC_RPC_URL=https://bsc-dataseed1.defibit.io/
# BSC_RPC_URL=https://bsc-dataseed1.ninicoin.io/
EOF
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi
echo ""

# Build the project
echo "🔨 Building TypeScript project..."
npm run build
echo "✅ Build completed"
echo ""

# Run tests
echo "🧪 Running tests..."
if npm test; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed, but setup completed. Please review test output."
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "To get started:"
echo "  1. Start the web server: npm run dev server"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Or use CLI: npm start <transaction-hash>"
echo ""
echo "Example CLI usage:"
echo "  npm start 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
echo ""




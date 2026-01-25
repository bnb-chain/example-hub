#!/bin/bash

# Transaction Inclusion Latency Tracker - Setup Script
# This script sets up the project with all dependencies and configuration

set -e

echo "🚀 Setting up Transaction Inclusion Latency Tracker..."
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
    echo "📝 Creating .env file..."
    cat > .env << EOF
# BSC RPC Endpoint
# You can use public endpoints or your own RPC provider
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Optional: Add your own RPC endpoint for better performance
# BSC_RPC_URL=https://bsc-mainnet.infura.io/v3/YOUR_API_KEY
# BSC_RPC_URL=https://bsc-mainnet.g.alchemy.com/v2/YOUR_API_KEY
EOF
    echo "✅ .env file created with default BSC RPC endpoint"
else
    echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Build TypeScript project
echo "🔨 Building TypeScript project..."
npm run build
echo "✅ Build completed"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
echo "✅ All tests passed"
echo ""

echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the development server: npm run dev"
echo "   2. Open your browser to: http://localhost:3000"
echo "   3. Or use CLI: npm start <transaction-hash>"
echo ""
echo "📖 For more information, see README.md"
echo ""




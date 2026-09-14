#!/bin/bash

# Proxy Upgrade History Reconstructor - Setup Script
# This script sets up the project with all dependencies and configuration

set -e

echo "🚀 Setting up Proxy Upgrade History Reconstructor..."
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

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with BSC RPC URL..."
    cat > .env << EOF
# BSC RPC URL - Using public BSC endpoint
# You can replace this with your own RPC endpoint for better performance
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Optional: Add your own RPC endpoint for better rate limits
# BSC_RPC_URL=https://your-custom-rpc-endpoint.com
EOF
    echo "✅ .env file created"
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
if npm test; then
    echo "✅ All tests passed"
else
    echo "⚠️  Some tests failed, but continuing with setup..."
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: npm run server"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Enter a proxy contract address to analyze"
echo ""
echo "💡 Example usage:"
echo "   npm start 0x1234567890123456789012345678901234567890"
echo ""




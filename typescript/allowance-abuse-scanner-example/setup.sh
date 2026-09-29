#!/bin/bash

# BNBChain Cookbook - Allowance Abuse Scanner Setup Script
# This script provides a hassle-free setup for evaluators

set -e  # Exit on error

echo "🚀 Setting up Allowance Abuse Scanner..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with default BSC RPC configuration..."
    if [ -f env.template ]; then
        cp env.template .env
        echo "✅ .env file created from template"
    else
        cat > .env << EOF
# BSC RPC Endpoint
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
EOF
        echo "✅ .env file created"
    fi
else
    echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo ""

# Run tests
echo "🧪 Running tests..."
if npm test; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "⚠️  Some tests failed, but setup completed. Please review test output."
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Open index.html in your browser to use the web UI"
echo "   2. Or run: npm start <wallet-address> for CLI usage"
echo ""
echo "Example CLI usage:"
echo "   npm start 0x1234567890123456789012345678901234567890"
echo ""


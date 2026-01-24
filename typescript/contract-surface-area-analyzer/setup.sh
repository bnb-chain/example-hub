#!/bin/bash

# Contract Surface Area Analyzer - Setup Script
# This script provides a no-friction setup for the project

set -e

echo "🚀 Setting up Contract Surface Area Analyzer..."
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

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# BSC RPC URL
# You can use the public RPC or your own node
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Optional: Add your BSCScan API key for enhanced functionality
# BSCSCAN_API_KEY=your_api_key_here
EOF
    echo "✅ .env file created with default BSC RPC URL"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi

echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Build completed successfully"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Open frontend.html in your browser to use the web interface"
echo "   2. Or run: npm start <contract-address> [contract-type]"
echo "   3. Example: npm start 0x55d398326f99059fF775485246999027B3197955 ERC20"
echo ""
echo "📚 For more information, see README.md"
echo ""



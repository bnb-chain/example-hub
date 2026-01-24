#!/bin/bash

# Event Entropy Analyzer - Spam Detection Setup Script
# This script sets up the project with all necessary dependencies and configuration

set -e

echo "🚀 Setting up Event Entropy Analyzer - Spam Detection..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
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
    echo "⚙️  Creating .env file..."
    cat > .env << EOF
# BSC RPC URL
# You can use the public endpoint or your own BSC node
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Alternative RPC endpoints (uncomment to use):
# BSC_RPC_URL=https://bsc-dataseed2.binance.org/
# BSC_RPC_URL=https://bsc-dataseed3.binance.org/
# BSC_RPC_URL=https://bsc-dataseed4.binance.org/
# BSC_RPC_URL=https://bsc-dataseed.binance.org/
EOF
    echo "✅ .env file created with default BSC RPC URL"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi

echo ""

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

echo ""

# Run tests
echo "🧪 Running tests..."
npm test

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'npm start <contract-address> [Transfer|Approval] [from-block] [to-block]' for CLI usage"
echo "   2. Run 'npm run serve' to start the web interface and API server"
echo "   3. Open http://localhost:8080 in your browser"
echo ""
echo "📚 Example usage:"
echo "   npm start 0x55d398326f99059fF775485246999027B3197955 Transfer 35000000 35001000"
echo ""
echo "🎉 Happy analyzing!"


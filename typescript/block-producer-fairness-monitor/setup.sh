#!/bin/bash

# Block Producer Fairness Monitor - Setup Script
# This script sets up the project with zero friction for evaluators

set -e  # Exit on any error

echo "🚀 Setting up Block Producer Fairness Monitor..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ and try again."
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
echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with default configuration..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created from env.example"
    else
        cat > .env << EOF
# BSC RPC URL - Using public BSC endpoint
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Server port
PORT=3000
EOF
        echo "✅ .env file created"
    fi
else
    echo "ℹ️  .env file already exists, skipping..."
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
    echo "⚠️  Some tests failed, but continuing with setup..."
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000"
echo ""
echo "Happy monitoring! 🔍"


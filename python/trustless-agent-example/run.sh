#!/bin/bash

# EIP-8004 Trustless Agents - Run Script
# This script sets up the virtual environment and runs the trustless agents server

set -e

echo "🚀 Setting up EIP-8004 Trustless Agents Server"
echo "================================================"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your PRIVATE_KEY before running!"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "0xYourPrivateKeyHere" ]; then
    echo "❌ PRIVATE_KEY not set in .env file. Please configure it first."
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
python -m pytest test_trustless_agents.py -v

# Start the server
echo "✅ Starting trustless agents server..."
echo "🌐 Frontend will be available at http://localhost:5002"
echo "📊 MCP server is running..."
echo ""
python trustless_agents.py

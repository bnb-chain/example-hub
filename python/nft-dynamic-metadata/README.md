# 🎨 Dynamic NFT Metadata Updater

A beginner-friendly Python project demonstrating dynamic NFT metadata that automatically updates based on simulated oracle data. Built with FastAPI, this project shows how NFTs can change their appearance and properties in response to external data sources.

## 📚 Overview

This project demonstrates:

- **Dynamic NFT Behavior**: NFT metadata changes automatically based on oracle data
- **Simulated Oracles**: Mock data sources for weather, price feeds, and sports scores
- **FastAPI Backend**: REST API serving ERC-721 compatible metadata
- **Web Dashboard**: Simple UI to view tokens, mint new ones, and trigger oracle updates
- **Off-Chain Storage**: Token registry using TinyDB (JSON-based database)

## ✨ Features

### 1. Token Registry (Off-Chain DB)

- Store token ID, owner, metadata attributes, and current dynamic state
- Track update history and timestamps
- Simple JSON-based storage with TinyDB

### 2. Mock Oracle Service

- **Weather Oracle**: Sunny, rainy, cloudy, stormy, snowy conditions
- **Price Feed Oracle**: Bullish, bearish, or neutral market trends
- **Sports Oracle**: Win, loss, or draw game outcomes
- Deterministic state cycling for predictable testing

### 3. Metadata Generator

- Generates ERC-721 compatible JSON metadata
- Dynamic image URLs based on current state
- Descriptive attributes that update with state changes
- Compatible with standard NFT marketplaces

### 4. FastAPI Endpoints

**API Routes:**

- `GET /api/health` - Health check
- `GET /api/metadata/{tokenId}` - Get ERC-721 metadata for a token
- `POST /api/mint` - Mint a new dynamic NFT
- `POST /api/oracle/update` - Trigger oracle update for all tokens
- `GET /api/tokens` - List all tokens
- `GET /api/oracle/data` - Get latest oracle data

**Web Routes:**

- `GET /` - Home page with token grid
- `GET /token/{id}` - Token detail page
- `GET /oracle` - Oracle update dashboard

### 5. Web UI Dashboard

- View all tokens in a responsive grid
- See current state and visual representation
- Mint new tokens with custom owner address
- Trigger oracle updates with different data sources
- View detailed token information and full metadata

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- pip or uv for package management

### Installation

1. **Clone the repository:**

```bash
cd python/nft-dynamic-metadata
```

2. **Create and activate virtual environment:**

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. **Install dependencies:**

```bash
pip install -e .
```

Or using uv:

```bash
uv venv
uv pip install -e .
```

4. **Set up environment variables (optional):**

```bash
# Copy example env file
cp env.example .env

# Edit .env if needed (defaults work fine)
```

### Running the Application

**Start the FastAPI server:**

```bash
python app.py
```

Or with uvicorn:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Access the application:**

- Web UI: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metadata API: http://localhost:8000/api/metadata/1

## 📖 Usage Examples

### Minting a Token via API

```bash
curl -X POST "http://localhost:8000/api/mint" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "initial_state": "sunny"
  }'
```

### Getting Token Metadata

```bash
curl "http://localhost:8000/api/metadata/1"
```

**Response:**

```json
{
  "name": "Dynamic NFT #1",
  "description": "NFT with dynamic metadata that updates based on oracle data. Current state: A bright and cheerful day!",
  "image": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-sunny.png",
  "attributes": [
    {
      "trait_type": "Token ID",
      "value": 1
    },
    {
      "trait_type": "Current State",
      "value": "Sunny"
    }
  ]
}
```

### Updating All Tokens with Oracle Data

```bash
curl -X POST "http://localhost:8000/api/oracle/update" \
  -H "Content-Type: application/json" \
  -d '{
    "oracle_type": "weather"
  }'
```

## 🧪 Testing

The project includes comprehensive tests for all components.

**Run all tests:**

```bash
pytest
```

**Run with coverage:**

```bash
pytest --cov=. --cov-report=html
```

**Run specific test file:**

```bash
pytest tests/test_database.py -v
pytest tests/test_oracle.py -v
pytest tests/test_metadata.py -v
pytest tests/test_api.py -v
```

**Test Coverage:**

- Database operations (10 tests)
- Oracle service functionality (10 tests)
- Metadata generation (10 tests)
- API endpoints (10 tests)

## 🏗️ Project Structure

```
nft-dynamic-metadata/
├── app.py                    # FastAPI application
├── database.py               # Token registry with TinyDB
├── oracle.py                 # Mock oracle service
├── metadata_generator.py     # ERC-721 metadata generator
├── pyproject.toml           # Project dependencies
├── env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── README.md                # This file
├── templates/               # Jinja2 HTML templates
│   ├── index.html           # Home page
│   ├── token_detail.html    # Token detail page
│   └── oracle_update.html   # Oracle update page
└── tests/                   # Test suite
    ├── __init__.py
    ├── test_database.py     # Database tests
    ├── test_oracle.py       # Oracle tests
    ├── test_metadata.py     # Metadata tests
    └── test_api.py          # API tests
```

## 🎯 How It Works

1. **Token Creation**: Mint a token with an owner address and initial state
2. **Oracle Update**: Fetch simulated data from the mock oracle
3. **State Determination**: Oracle determines new state based on data
4. **Metadata Update**: Database updates token state, metadata reflects new state
5. **Dynamic Display**: UI and API show updated metadata with new image and attributes

## 🌟 Example Use Cases

- **Weather NFTs**: Change appearance based on current weather conditions
- **Market NFTs**: Reflect bullish/bearish market sentiment
- **Gaming NFTs**: Update based on game outcomes or player stats
- **Event NFTs**: Change state based on real-world events

## 🛠️ Configuration

Environment variables (optional):

```bash
DATABASE_PATH=./nft_data.json       # Path to JSON database
HOST=0.0.0.0                        # Server host
PORT=8000                           # Server port
ORACLE_UPDATE_INTERVAL=300          # Auto-update interval (seconds)
```

## 📝 API Documentation

Full interactive API documentation available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

This is an example project for learning purposes. Feel free to:

- Extend oracle types
- Add more dynamic states
- Integrate real oracle data
- Enhance the UI
- Add on-chain smart contract integration

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Related Examples

Check out other BNB Chain examples:

- `python/chatbot-with-ui` - AI chatbot with FastAPI
- `python/langchain-chatbot` - LangChain agent
- `python/pancake-swap-example` - DEX integration

## 💡 Next Steps

To make this production-ready:

1. Integrate real Chainlink oracles
2. Deploy smart contract on BNB Chain
3. Store token data on-chain
4. Add IPFS for decentralized metadata storage
5. Implement authentication and ownership verification
6. Add automated oracle update scheduling

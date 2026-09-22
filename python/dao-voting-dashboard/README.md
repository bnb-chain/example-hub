# DAO Voting Dashboard

Off-chain + on-chain DAO governance dashboard built with FastAPI and Web3.py for BNB Chain.

## 🌟 Features

- **Off-Chain Proposal Management**: Create and manage proposals stored in SQLite database
- **Cryptographic Vote Signing**: Sign votes with private keys using eth-account
- **Vote Aggregation**: Batch votes off-chain before syncing to reduce gas costs
- **On-Chain Integration**: Mock governance contract interaction (production-ready pattern)
- **Governance Rules**: Configurable quorum (20%) and approval threshold (50%)
- **Web Dashboard**: Clean Jinja2 templates for proposal creation, voting, and results
- **RESTful API**: FastAPI backend with comprehensive endpoints
- **Comprehensive Tests**: 100+ tests covering all components

## 🏗️ Architecture

```
┌─────────────────┐
│   Web UI        │  Jinja2 Templates
│  (Frontend)     │  index.html, proposal.html, results.html
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI App    │  REST API endpoints
│  (Backend)      │  /api/proposals, /api/proposals/{id}/vote
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬────────────┐
    ▼         ▼              ▼            ▼
┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│Database│ │Governance│ │ Crypto  │ │ Contract │
│(SQLite)│ │  Rules   │ │  Utils  │ │(Web3.py) │
└────────┘ └──────────┘ └─────────┘ └──────────┘
```

## 📦 Installation

### Using uv (Recommended)

```bash
# Install uv
pip install uv

# Install dependencies
uv pip install -e .

# Or install in development mode
uv pip install -e ".[dev]"
```

### Using pip

```bash
pip install -r requirements.txt
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:
```env
RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
GOVERNANCE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
QUORUM_PERCENTAGE=20
APPROVAL_THRESHOLD_PERCENTAGE=50
DEMO_PRIVATE_KEY=0x0123456789abcdef...
```

## 🚀 Quick Start

### 1. Start the Server

```bash
# Using uvicorn directly
uvicorn app:app --reload

# Or using Python
python app.py
```

Server runs at `http://localhost:8000`

### 2. Access the Dashboard

Open your browser to:
- Dashboard: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Create a Proposal

```bash
curl -X POST "http://localhost:8000/api/proposals" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase Treasury Allocation",
    "description": "Allocate 10,000 tokens to community development",
    "creator": "0x1234567890123456789012345678901234567890",
    "duration_hours": 168
  }'
```

### 4. Cast a Vote

```bash
curl -X POST "http://localhost:8000/api/proposals/1/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0xabcdef0123456789012345678901234567890abc",
    "vote_choice": "for",
    "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }'
```

### 5. View Results

```bash
curl "http://localhost:8000/api/proposals/1/results"
```

## 📚 API Documentation

### Proposals

#### Create Proposal
```http
POST /api/proposals
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "creator": "0x...",
  "duration_hours": 168
}
```

#### List Proposals
```http
GET /api/proposals?status=active
```

#### Get Proposal Details
```http
GET /api/proposals/{proposal_id}
```

### Voting

#### Cast Vote
```http
POST /api/proposals/{proposal_id}/vote
Content-Type: application/json

{
  "voter_address": "0x...",
  "vote_choice": "for|against",
  "private_key": "0x..."
}
```

#### Get Results
```http
GET /api/proposals/{proposal_id}/results
```

#### Sync Votes to Chain
```http
POST /api/proposals/{proposal_id}/sync
```

#### Close Proposal
```http
POST /api/proposals/{proposal_id}/close
```

## 🧪 Testing

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html --cov-report=term
```

### Run Specific Test Suite

```bash
# Test database
pytest tests/test_database.py -v

# Test API endpoints
pytest tests/test_api.py -v

# Test governance logic
pytest tests/test_governance.py -v

# Test cryptographic functions
pytest tests/test_crypto.py -v

# Test contract interactions
pytest tests/test_contract.py -v
```

## 🎯 Governance Rules

### Quorum Requirement
- **Default**: 20% of eligible voters must participate
- Formula: `required_votes = total_eligible_voters * 0.20`
- Configurable via `QUORUM_PERCENTAGE` in `.env`

### Approval Threshold
- **Default**: 50% of votes must be "for"
- Formula: `approval_rate = votes_for / (votes_for + votes_against) * 100`
- Configurable via `APPROVAL_THRESHOLD_PERCENTAGE` in `.env`

### Proposal Outcomes

| Condition | Outcome |
|-----------|---------|
| Quorum met + Approval ≥ 50% | ✅ **Passed** |
| Quorum not met | ❌ **Rejected** (Quorum not met) |
| Quorum met + Approval < 50% | ❌ **Rejected** (Approval threshold not met) |

## 🔐 Security Notes

**⚠️ IMPORTANT**: This is a demo application. Do NOT use in production without:

1. **Never expose private keys in requests**: Implement proper wallet connection (MetaMask, WalletConnect)
2. **Secure the API**: Add authentication, rate limiting, and input validation
3. **Use real on-chain contracts**: Replace mock contract with actual smart contract
4. **Implement proper Merkle proofs**: Current implementation is mock only
5. **Add voter eligibility checks**: Query token balances or NFT ownership
6. **Secure database**: Use proper database credentials and connection pooling
7. **HTTPS only**: Never run in production over HTTP

## 🛠️ Development

### Project Structure

```
dao-voting-dashboard/
├── app.py                 # FastAPI application
├── config.py              # Configuration management
├── database.py            # SQLite database layer
├── crypto_utils.py        # Vote signing & Merkle proofs
├── governance.py          # Governance rules engine
├── contract.py            # Web3 contract interactions
├── templates/             # Jinja2 HTML templates
│   ├── index.html
│   ├── proposal.html
│   └── results.html
├── tests/                 # Test suite
│   ├── test_database.py
│   ├── test_crypto.py
│   ├── test_governance.py
│   ├── test_contract.py
│   └── test_api.py
├── pyproject.toml         # Project metadata
├── .env.example           # Environment template
└── README.md
```

### Adding New Features

1. **Database Changes**: Update schema in `database.py`
2. **API Endpoints**: Add routes in `app.py`
3. **Governance Logic**: Modify rules in `governance.py`
4. **Smart Contract**: Update ABI and methods in `contract.py`
5. **Tests**: Add test cases in `tests/`

## 🌐 Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in environment
- [ ] Use production database (PostgreSQL recommended)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up monitoring and logging
- [ ] Deploy smart contracts to mainnet
- [ ] Implement proper wallet connection
- [ ] Add rate limiting and API authentication
- [ ] Configure CORS properly
- [ ] Set up CI/CD pipeline

### Deploy to Cloud

```bash
# Example: Deploy with Gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📊 Example Flow

1. **Create Proposal**: DAO member creates proposal via UI or API
2. **Off-Chain Voting**: Users vote and signatures are stored in SQLite
3. **Vote Aggregation**: Votes accumulate off-chain to save gas
4. **Sync to Chain**: Batch sync aggregated votes to smart contract
5. **Finalize**: After deadline, proposal is closed and outcome determined
6. **Execution**: Passed proposals can be executed on-chain

## 🤝 Contributing

This is an example project for the BNB Chain Cookbook. Feel free to:
- Report issues
- Submit pull requests
- Suggest improvements
- Use as a template for your own DAO

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [BNB Chain Documentation](https://docs.bnbchain.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Web3.py Documentation](https://web3py.readthedocs.io/)
- [eth-account Documentation](https://eth-account.readthedocs.io/)

## 💡 Tips

- Use `uv` for faster dependency management
- Run tests before committing changes
- Check API docs at `/docs` for interactive testing
- Monitor database size in production
- Batch vote syncing to reduce gas costs
- Consider using Redis for caching in production

---

Built with ❤️ for BNB Chain Cookbook

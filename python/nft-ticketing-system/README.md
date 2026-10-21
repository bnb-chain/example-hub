# NFT Ticketing System

Simple NFT-based event ticketing system on BNB Chain with QR code verification.

## Features

- **Event Management**: Create and manage events with capacity limits
- **NFT Ticket Minting**: Mint tickets as NFTs on BNB Chain (mock implementation)
- **QR Code Generation**: Automatic QR code generation for each ticket
- **Ticket Verification**: Check-in system with QR code scanning
- **Web Dashboard**: Clean FastAPI + Jinja2 UI for all operations
- **Mock Blockchain**: Simulated smart contract for educational purposes

## Architecture

```
Off-Chain (SQLite)
├── Events (id, name, date, location, capacity)
└── Tickets (token_id, event_id, owner, qr_code, checked_in)

On-Chain (Mock)
├── mintTicket(address, eventId) → tokenId
├── ownerOf(tokenId) → address
└── totalSupply(eventId) → count
```

## Installation

```bash
pip install fastapi uvicorn web3 python-dotenv jinja2 qrcode pillow pytest httpx
```

## Usage

```bash
python app.py
# Visit http://localhost:8000
```

### Web Interface

- `/` - Home page with recent events
- `/events` - Browse all events
- `/mint` - Mint NFT tickets
- `/verify` - Verify tickets with QR code

### API Endpoints

**Create Event:**

```bash
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Concert", "date": "2025-12-01", "location": "Venue", "capacity": 100}'
```

**Mint Ticket:**

```bash
curl -X POST http://localhost:8000/api/mint \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Verify Ticket:**

```bash
curl -X POST http://localhost:8000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"qr_data": "TICKET:1:EVENT:1"}'
```

## Testing

```bash
pytest                    # Run all tests
pytest --cov             # With coverage
pytest tests/test_api.py # Specific file
```

## License

MIT

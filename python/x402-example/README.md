# Crypto Payment Simulator - Fermi 450ms Block Time

A demonstration of BNB Chain's Fermi upgrade showcasing sub-second transaction finality with 450ms block times. This interactive application allows you to send payments and measure real-time transaction confirmation speeds.

## Overview

This example demonstrates the speed improvements brought by BNB Chain's Fermi hard fork, which reduced block times from 0.75 seconds to 0.45 seconds (450ms). With fast finality, transactions can be confirmed in approximately 1.125 seconds, making BNB Chain one of the fastest EVM-compatible chains.

## Screenshot

![Fermi Payment Simulator Interface](https://i.imgur.com/qoQviIe.png)

## Features

- **Real-time Payment Processing**: Send BNB payments and see instant confirmation
- **Timing Metrics**: Measure actual vs theoretical confirmation times
- **Interactive Frontend**: Beautiful web interface for testing payments
- **Transaction History**: View recent transactions with timing data
- **Network Statistics**: Monitor current block time and network status
- **MCP Integration**: Full Model Context Protocol support for AI agents

## Prerequisites

- Python 3.8 or higher
- A BSC testnet wallet with TBNB for testing
- Access to BSC testnet RPC endpoint

## Installation

1. Navigate to the 450ms-payment-simulator directory:
```bash
cd 450ms-payment-simulator
```

2. Run the setup script:
```bash
./run.sh
```

The script will:
- Create a virtual environment
- Install all dependencies
- Run tests
- Start the server

## Configuration

Create a `.env` file (or copy from `.env.example`):

```bash
PRIVATE_KEY=0xYourPrivateKeyHere
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## Usage

### Running the Application

```bash
./run.sh
```

The application will start on `http://localhost:5000`

### Available Tools

#### `send_payment`

Send a payment and measure finality time.

**Parameters:**
- `recipient_address` (string, required): BSC testnet address to receive payment
- `amount` (float, required): Amount of BNB to send
- `note` (string, optional): Payment description

**Example:**
```json
{
  "recipient_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 0.1,
  "note": "Payment for services"
}
```

**Returns:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 0.1,
  "block_number": 12345,
  "status": "confirmed",
  "timing": {
    "total_time_seconds": 0.523,
    "confirmation_time_seconds": 0.478,
    "blocks_to_confirm": 2,
    "theoretical_time_450ms_blocks": 0.9,
    "efficiency_percent": 188.28
  },
  "timestamp": "2026-01-24T10:30:00"
}
```

#### `get_payment_history`

Get recent payment transaction history.

**Parameters:**
- `limit` (int, optional): Maximum number of transactions (default: 10)

**Returns:**
```json
{
  "success": true,
  "count": 5,
  "transactions": [...]
}
```

#### `get_balance`

Get balance of an address.

**Parameters:**
- `address` (string, optional): Address to check (defaults to sender)

**Returns:**
```json
{
  "success": true,
  "address": "0x...",
  "balance_wei": "1000000000000000000",
  "balance_bnb": 1.0,
  "network": "BSC Testnet (Fermi - 450ms blocks)"
}
```

#### `get_network_stats`

Get current network statistics.

**Returns:**
```json
{
  "success": true,
  "network": "BSC Testnet",
  "chain_id": 97,
  "current_block": 50000,
  "fermi_block_time_seconds": 0.45,
  "theoretical_finality_seconds": 1.125
}
```

## Demo Example

### Input

1. Open the web interface at `http://localhost:5000`
2. Enter recipient address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
3. Enter amount: `0.1` BNB
4. Add note: `"Test payment"`
5. Click "Send Payment"

### Expected Output

```
Payment Successful!
Transaction: 0x1234567890abcdef...
Confirmed in 0.478s
Block: 50001
```

### Timing Breakdown

- **Submission Delay**: ~0.045s (network latency)
- **Confirmation Time**: ~0.478s (actual block confirmation)
- **Total Time**: ~0.523s
- **Blocks to Confirm**: 2 blocks
- **Theoretical Time**: 0.9s (2 × 450ms)
- **Efficiency**: 188% (faster than theoretical due to network optimization)

## Network Information

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **Block Time**: 450ms (Fermi upgrade)
- **Fast Finality**: ~1.125 seconds
- **RPC Endpoint**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/

## Testing

Run unit tests:

```bash
source venv/bin/activate
pytest test_payment_simulator.py -v
```

Run tests with coverage:

```bash
pytest test_payment_simulator.py --cov=payment_simulator --cov-report=html
```

## Architecture

- **Backend**: Flask web server with MCP integration
- **Frontend**: HTML/CSS/JavaScript single-page application
- **Blockchain**: Web3.py for BSC testnet interaction
- **Protocol**: Model Context Protocol (MCP) for AI agent integration

## Key Metrics Demonstrated

1. **Block Time**: 450ms (down from 750ms)
2. **Fast Finality**: ~1.125 seconds (2.5 blocks)
3. **Throughput**: Up to 5,000 DEX swaps per second
4. **Confirmation Speed**: Sub-second transaction finality

## Security Notes

- ⚠️ **Never commit your private key** to version control
- Use environment variables for sensitive data
- This example is for testnet use only
- Always verify addresses before sending payments

## Troubleshooting

### Connection Issues
- Verify RPC endpoint is accessible
- Check internet connection
- Ensure BSC testnet is operational

### Transaction Failures
- Verify sufficient balance for gas fees
- Check recipient address is valid
- Ensure private key is correctly configured

### Frontend Not Loading
- Verify Flask server is running on port 5000
- Check browser console for errors
- Ensure templates directory exists

## License

This project is provided as-is for educational and demonstration purposes.

## References

- [BNB Chain Fermi Upgrade](https://docs.bnbchain.org/announce/fermi-bsc/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [BNB Chain Documentation](https://docs.bnbchain.org)

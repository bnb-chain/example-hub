# x402 Payment Protocol Implementation

An implementation of the x402 payment protocol on BNB Chain, demonstrating HTTP 402 "Payment Required" status code for internet-native payments with sign-to-pay functionality.

## Overview

x402 is an open, internet-native payment standard that enables autonomous payments between AI agents, APIs, and services using blockchain technology. This implementation showcases:

- **HTTP 402 Payment Required**: Standard HTTP status code for payment requests
- **Sign-to-Pay**: EIP-712 signature-based payment authorization
- **No API Keys Required**: Eliminates need for registrations or KYC
- **EIP-7702 Support**: Delegated execution for one-time transaction permissions
- **Gas-Sponsored Relayer**: Automatic payment handling

## Screenshot

![X402 Interface](https://i.imgur.com/usxLzhF.png)

## Features

- **Payment Request Creation**: Generate EIP-712 signed payment requests
- **Signature Verification**: Verify payer signatures cryptographically
- **On-Chain Execution**: Execute verified payments on BNB Chain
- **Interactive Frontend**: Web interface for testing x402 payments
- **MCP Integration**: Full Model Context Protocol support

## Prerequisites

- Python 3.8 or higher
- A BSC testnet wallet for merchant operations
- Access to BSC testnet RPC endpoint

## Installation

1. Navigate to the x402-example directory:
```bash
cd x402-example
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
PAYMENT_TOKEN=USDC
PAYMENT_TOKEN_ADDRESS=
```

## Usage

### Running the Application

```bash
./run.sh
```

The application will start on `http://localhost:5001`

### Available Tools

#### `create_payment_request`

Create a payment request following x402 protocol.

**Parameters:**
- `resource` (string, required): The resource or service being paid for
- `amount` (float, required): Amount to charge
- `currency` (string, optional): Currency type (default: USDC)
- `description` (string, optional): Payment description

**Example:**
```json
{
  "resource": "API Access",
  "amount": 10.0,
  "currency": "USDC",
  "description": "Monthly API subscription"
}
```

**Returns:**
```json
{
  "success": true,
  "payment_id": "x402_1234567890",
  "http_status": 402,
  "payment_request": {
    "payment_id": "x402_1234567890",
    "resource": "API Access",
    "amount": 10.0,
    "currency": "USDC",
    "signature": "0x...",
    "status": "pending"
  }
}
```

#### `verify_payment_signature`

Verify a payment signature from the payer.

**Parameters:**
- `payment_id` (string, required): The payment request ID
- `payer_address` (string, required): Address of the payer
- `payer_signature` (string, required): EIP-712 signature from payer

**Returns:**
```json
{
  "success": true,
  "verified": true,
  "payer": "0x...",
  "message": "Payment signature verified. Ready for execution."
}
```

#### `execute_payment`

Execute the payment transaction on-chain.

**Parameters:**
- `payment_id` (string, required): The payment request ID
- `payer_address` (string, required): Address of the payer

**Returns:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "block_number": 12345,
  "status": "completed"
}
```

#### `get_payment_status`

Get the status of a payment request.

**Parameters:**
- `payment_id` (string, required): The payment request ID

**Returns:**
```json
{
  "success": true,
  "payment_request": {
    "payment_id": "x402_1234567890",
    "status": "completed",
    "tx_hash": "0x...",
    ...
  }
}
```

#### `list_payment_requests`

List all payment requests, optionally filtered by status.

**Parameters:**
- `status` (string, optional): Filter by status (pending, verified, completed)

**Returns:**
```json
{
  "success": true,
  "count": 5,
  "payment_requests": [...]
}
```

## Demo Example

### Step 1: Create Payment Request

**Input:**
```json
POST /api/payment_request
{
  "resource": "API Access",
  "amount": 10.0,
  "currency": "USDC",
  "description": "Monthly subscription"
}
```

**Output:**
```
HTTP 402 Payment Required
{
  "payment_id": "x402_1234567890",
  "signature": "0xabc123...",
  "status": "pending"
}
```

### Step 2: Verify Payment Signature

**Input:**
```json
POST /api/payment/x402_1234567890/verify
{
  "payer_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "payer_signature": "0xdef456..."
}
```

**Output:**
```json
{
  "verified": true,
  "status": "verified"
}
```

### Step 3: Execute Payment

**Input:**
```json
POST /api/payment/x402_1234567890/execute
{
  "payer_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Output:**
```json
{
  "success": true,
  "transaction_hash": "0x789abc...",
  "block_number": 50001,
  "status": "completed"
}
```

## Payment Flow

1. **Client Request**: Client requests a resource
2. **HTTP 402 Response**: Server responds with 402 and payment parameters
3. **Payment Signature**: Client signs payment intent with EIP-712
4. **Verification**: Server verifies the signature
5. **Execution**: Payment is executed on-chain
6. **Access Granted**: Client retries request with payment proof

## Network Information

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **Protocol**: x402 (HTTP 402 Payment Required)
- **Signature Standard**: EIP-712
- **RPC Endpoint**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/

## Testing

Run unit tests:

```bash
source venv/bin/activate
pytest test_x402_payment.py -v
```

Run tests with coverage:

```bash
pytest test_x402_payment.py --cov=x402_payment --cov-report=html
```

## Architecture

- **Backend**: Flask web server with MCP integration
- **Frontend**: HTML/CSS/JavaScript single-page application
- **Blockchain**: Web3.py for BSC testnet interaction
- **Signatures**: EIP-712 typed data signing
- **Protocol**: Model Context Protocol (MCP) for AI agent integration

## Key Features of x402

1. **No API Keys**: Eliminates need for API keys or registrations
2. **No KYC**: Direct payment without identity verification
3. **Sign-to-Pay**: Single signature replaces multiple steps
4. **Gas Sponsored**: Relayer handles gas payments
5. **Internet-Native**: Uses standard HTTP status codes

## Security Notes

- ⚠️ **Never commit your private key** to version control
- Use environment variables for sensitive data
- This example is for testnet use only
- Always verify signatures before executing payments
- Implement rate limiting for production use

## Troubleshooting

### Signature Verification Fails
- Verify payer address matches signature
- Check EIP-712 domain and message structure
- Ensure chain ID is correct

### Payment Execution Fails
- Verify payment request is in "verified" status
- Check merchant wallet has sufficient balance
- Ensure RPC endpoint is accessible

### Frontend Not Loading
- Verify Flask server is running on port 5001
- Check browser console for errors
- Ensure templates directory exists

## License

This project is provided as-is for educational and demonstration purposes.

## References

- [x402 Protocol](https://www.x402.org/)
- [x402 BNB Implementation](https://www.x402bnb.pro/)
- [EIP-712: Typed Structured Data Hashing](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-7702: Set EOA Account Code](https://eips.ethereum.org/EIPS/eip-7702)
- [Model Context Protocol](https://modelcontextprotocol.io)

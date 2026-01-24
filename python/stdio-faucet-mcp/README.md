# TBNB Faucet MCP Server

A Model Context Protocol (MCP) server that provides a faucet service for disbursing testnet BNB (TBNB) tokens on the Binance Smart Chain testnet.

## Overview

This MCP server allows AI agents and other MCP clients to request testnet BNB tokens by simply providing a recipient address. The server handles all blockchain interactions, including transaction signing and broadcasting.

## Features

- **Request TBNB**: Send testnet BNB tokens to any BSC testnet address
- **Balance Checking**: Check faucet balance and recipient address balances
- **MCP Standard**: Fully compliant with Anthropic's Model Context Protocol
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

- Python 3.8 or higher
- A BSC testnet wallet with TBNB for the faucet
- Access to BSC testnet RPC endpoint

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Configuration

Set the following environment variables:

- `PRIVATE_KEY`: Your faucet wallet's private key (required)
- `BSC_TESTNET_RPC`: BSC testnet RPC endpoint (optional, defaults to public endpoint)

Example:

```bash
export PRIVATE_KEY="0x..."
export BSC_TESTNET_RPC="https://data-seed-prebsc-1-s1.binance.org:8545/"
```

## Usage

### Running the Server

Run the server using the MCP protocol:

```bash
python server.py
```

The server communicates via stdio by default, which is the standard for MCP servers.

### Available Tools

#### `request_tbnb`

Request testnet BNB tokens from the faucet.

**Parameters:**
- `recipient_address` (string, required): The BSC testnet address to receive tokens
- `amount` (float, optional): Amount of TBNB to send (default: 0.1, max: 1.0)

**Example:**
```json
{
  "recipient_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 0.1
}
```

#### `get_faucet_balance`

Get the current balance of the faucet wallet.

**Returns:**
- Balance in Wei and TBNB
- Faucet address
- Network information

#### `check_address_balance`

Check the TBNB balance of any BSC testnet address.

**Parameters:**
- `address` (string, required): The BSC testnet address to check

## Integration with MCP Clients

This server can be integrated with any MCP-compatible client. The server exposes tools that can be discovered and invoked by AI agents automatically.

### Example MCP Client Configuration

```json
{
  "mcpServers": {
    "tbnb-faucet": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "BSC_TESTNET_RPC": "https://data-seed-prebsc-1-s1.binance.org:8545/"
      }
    }
  }
}
```

## Security Notes

- **Never commit your private key** to version control
- Use environment variables or secure secret management
- The faucet should only be used on testnets
- Consider implementing rate limiting for production use

## Network Information

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **RPC Endpoint**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/

## Troubleshooting

### Connection Issues

If you encounter connection errors, verify:
- Your internet connection
- The RPC endpoint is accessible
- The BSC testnet is operational

### Transaction Failures

Common causes:
- Insufficient balance in faucet wallet
- Invalid recipient address
- Network congestion (try again later)

### Private Key Issues

Ensure your private key:
- Starts with `0x`
- Is 66 characters long (including `0x` prefix)
- Has sufficient TBNB for gas fees

## License

This project is provided as-is for educational and development purposes.

## Support

For issues related to:
- MCP Protocol: See [Anthropic MCP Documentation](https://modelcontextprotocol.io)
- BSC Testnet: See [BNB Chain Documentation](https://docs.bnbchain.org)

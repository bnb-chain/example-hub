# TBNB Faucet MCP Server (Node.js)

A Node.js implementation of a Model Context Protocol (MCP) server that provides a faucet service for distributing testnet BNB tokens on the Binance Smart Chain testnet.

## About

This MCP server enables AI agents and other MCP clients to request and receive testnet BNB tokens by interacting with the BSC testnet blockchain. It follows the Anthropic MCP specification and can be integrated with any MCP-compatible client.

## Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- A BSC testnet wallet with TBNB for the faucet
- Access to BSC testnet RPC endpoint

## Installation

1. Navigate to the project directory:
```bash
cd faucet-mcp
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Set the following environment variables before running:

- `FAUCET_PRIVATE_KEY`: The private key of your faucet wallet (required)
- `BSC_TESTNET_RPC`: BSC testnet RPC endpoint URL (optional, has default)

Example:

```bash
export FAUCET_PRIVATE_KEY="0x..."
export BSC_TESTNET_RPC="https://data-seed-prebsc-1-s1.binance.org:8545/"
```

Or create a `.env` file (not included in repo for security):

```
FAUCET_PRIVATE_KEY=0x...
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## Usage

Run the server:

```bash
node index.js
```

Or using npm:

```bash
npm start
```

The server communicates via stdio, which is the standard transport for MCP servers.

## Available Tools

### send_tbnb

Sends testnet BNB tokens to a recipient address.

**Parameters:**
- `recipient` (string, required): BSC testnet address to receive tokens
- `amount` (number, optional): Amount of TBNB to send (default: 0.1, max: 1.0)

**Returns:**
- Transaction hash
- Recipient address
- Amount sent
- Block number
- Transaction status

### get_faucet_info

Retrieves information about the faucet wallet.

**Parameters:** None

**Returns:**
- Faucet wallet address
- Current balance (Wei and TBNB)
- Network information
- RPC endpoint

### get_balance

Queries the TBNB balance of any BSC testnet address.

**Parameters:**
- `address` (string, required): BSC testnet address to check

**Returns:**
- Address (checksummed)
- Balance in Wei and TBNB
- Network name

## MCP Client Integration

To integrate this server with an MCP client, add it to your client configuration:

```json
{
  "mcpServers": {
    "tbnb-faucet": {
      "command": "node",
      "args": ["/absolute/path/to/index.js"],
      "env": {
        "FAUCET_PRIVATE_KEY": "0x...",
        "BSC_TESTNET_RPC": "https://data-seed-prebsc-1-s1.binance.org:8545/"
      }
    }
  }
}
```

## Network Configuration

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **Default RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Block Explorer**: https://testnet.bscscan.com

## Error Handling

The server includes comprehensive error handling:

- Address validation (checksum and format)
- Amount validation (0 to 1.0 TBNB)
- Self-transfer prevention
- Network connectivity checks
- Transaction error reporting

All errors are returned as structured JSON responses.

## Security

🔒 **Security Best Practices:**

- Never commit your private key to version control
- Use environment variables or secure secret management systems
- This server is intended for testnet use only
- Consider implementing rate limiting for production deployments
- Monitor faucet balance and set up alerts

## Troubleshooting

### Common Issues

**"Faucet wallet not configured"**
- Ensure `FAUCET_PRIVATE_KEY` environment variable is set
- Verify the private key is valid and starts with `0x`

**Connection errors**
- Check your internet connection
- Verify the RPC endpoint is accessible
- Try an alternative BSC testnet RPC endpoint

**Transaction failures**
- Ensure the faucet wallet has sufficient TBNB balance
- Verify the recipient address is valid
- Check network conditions (gas prices, congestion)

**Module not found errors**
- Run `npm install` to install dependencies
- Ensure you're using Node.js 18.0 or higher

## Development

The server uses:
- `@modelcontextprotocol/sdk` for MCP protocol implementation
- `ethers.js` v6 for blockchain interactions

## License

MIT License

## Testing

Run unit tests:

```bash
npm install
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [BNB Chain Documentation](https://docs.bnbchain.org)
- [Ethers.js Documentation](https://docs.ethers.org)

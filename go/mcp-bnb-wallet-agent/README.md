# BNB Chain Wallet MCP Server

A Model Context Protocol (MCP) server implementation for managing BNB Chain wallets. This example demonstrates how to build an MCP server that provides wallet creation, transaction signing, and balance checking capabilities for BNB Smart Chain.

## Overview

This project provides:
- **MCP Server**: Exposes wallet operations as MCP tools that can be used by AI agents
- **MongoDB Integration**: Stores user wallets securely with their private keys
- **BNB Chain Support**: Works with both BSC Mainnet (chain ID 56) and BSC Testnet (chain ID 97)
- **Example Client**: Shows how to interact with the MCP server programmatically

## Features

### Available MCP Tools

1. **create_wallet** - Generate a new Ethereum-compatible wallet for a user
2. **read_wallet** - Retrieve a user's public wallet address
3. **get_wallet_balance** - Check the BNB balance of a wallet
4. **transfer_asset** - Send native BNB to another address
5. **sign_transaction** - Sign and broadcast custom transactions

## Prerequisites

- Go 1.23 or higher
- MongoDB (local or remote instance)
- BNB Chain RPC endpoint (testnet or mainnet)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd go/mcp-bnb-wallet-agent
```

2. Install dependencies:
```bash
go mod download
```

3. Set up environment variables:
```bash
# MongoDB connection string
export MONGO_URI="mongodb://localhost:27017"

# BNB Chain RPC endpoint
export BNB_RPC="https://data-seed-prebsc-1-s1.binance.org:8545"  # Testnet
# Or for mainnet: https://bsc-dataseed.binance.org/

# Optional: Custom server port (defaults to 8085)
export PORT="8085"
```

## Running the Project

### Start the MCP Server

```bash
cd wallet-mcp
go run main.go
```

The server will start on `http://localhost:8085/mcp`

You should see output like:
```
Connected to MongoDB successfully
Registered MCP tool: create_wallet
Registered MCP tool: read_wallet
Registered MCP tool: sign_transaction
Registered MCP tool: transfer_asset
Registered MCP tool: get_wallet_balance
Starting MCP server on port 8085...
```

### Run the Example Client

In a separate terminal:

```bash
go run example_client.go
```

This demonstrates how to:
- Create a wallet for a user
- Retrieve the wallet address
- Check wallet balance
- Transfer BNB to another address
- Sign custom transactions

## Usage

### Creating a Wallet

```go
client := NewMCPClient("http://localhost:8085/mcp")

walletAddress, err := client.CallTool("create_wallet", map[string]interface{}{
    "user_id": "user_12345",
})
```

### Checking Balance

```go
balance, err := client.CallTool("get_wallet_balance", map[string]interface{}{
    "user_id": "user_12345",
})
```

### Transferring BNB

```go
txHash, err := client.CallTool("transfer_asset", map[string]interface{}{
    "user_id":    "user_12345",
    "chain_id":   "97",  // BSC Testnet
    "to_address": "0x5A2D55362b3ce1Bb5434c16a2aBd923c429a3446",
    "amount":     "100000000000000",  // 0.0001 BNB in wei
})
```

## Project Structure

```
mcp-bnb-wallet-agent/
├── wallet-mcp/
│   ├── main.go                    # MCP server entry point
│   ├── db/
│   │   └── mongodb.go             # MongoDB connection utilities
│   ├── types/
│   │   └── types.go               # Type definitions
│   └── functions/
│       ├── structs.go             # Data structures
│       ├── create.go              # Wallet creation
│       ├── read.go                # Wallet reading
│       ├── sign.go                # Transaction signing
│       ├── transferAsset.go       # BNB transfers
│       ├── walletBalance.go       # Balance checking
│       ├── mcpToolGenerator.go    # MCP tool registration
│       └── tests/                 # Unit tests
├── example_client.go              # Example usage
├── go.mod                         # Go module definition
└── README.md                      # This file
```

## Testing

Run the test suite:

```bash
cd wallet-mcp/functions
go test ./tests/... -v
```

**Note**: Tests require:
- MongoDB running on `localhost:27017`
- `BNB_RPC` environment variable set
- Sufficient testnet BNB in test wallets for transaction tests

## Security Considerations

⚠️ **Important**: This is an example project for educational purposes.

- Private keys are stored unencrypted in MongoDB
- In production, you should:
  - Encrypt private keys before storage
  - Use hardware security modules (HSM) or secure enclaves
  - Implement proper access controls
  - Add rate limiting
  - Use secure key management solutions

## Chain IDs

- **BSC Mainnet**: 56
- **BSC Testnet**: 97

## API Reference

### MCP Tools

#### create_wallet
- **Description**: Create a new BNB Chain wallet for a user
- **Parameters**:
  - `user_id` (string, required): Unique identifier for the user
- **Returns**: Public wallet address

#### read_wallet
- **Description**: Retrieve a user's public wallet address
- **Parameters**:
  - `user_id` (string, required): Unique identifier for the user
- **Returns**: Public wallet address

#### get_wallet_balance
- **Description**: Get the native BNB balance of a user's wallet
- **Parameters**:
  - `user_id` (string, required): Unique identifier for the user
- **Returns**: Balance in wei (string)

#### transfer_asset
- **Description**: Transfer native BNB to another address
- **Parameters**:
  - `user_id` (string, required): Unique identifier for the user
  - `chain_id` (string, required): Chain ID (e.g., "56" for mainnet, "97" for testnet)
  - `to_address` (string, required): Recipient wallet address
  - `amount` (string, required): Amount to send in wei
- **Returns**: Transaction hash

#### sign_transaction
- **Description**: Sign and broadcast a transaction to BNB Chain
- **Parameters**:
  - `user_id` (string, required): Unique identifier for the user
  - `chain_id` (string, required): Chain ID
  - `to_address` (string, required): Destination address
  - `data` (string, optional): Hex-encoded transaction data
  - `value` (string, optional): Amount of BNB to send in wei
- **Returns**: Transaction hash

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is part of the BNB Chain examples repository.

## Resources

- [BNB Chain Documentation](https://docs.bnbchain.org/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Go Ethereum Documentation](https://geth.ethereum.org/docs)

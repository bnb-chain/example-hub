# Proxy Upgrade History Reconstructor

BNBChain Cookbook: A powerful tool to reconstruct and visualize the complete upgrade history of proxy contracts on BNB Smart Chain (BSC).

![Proxy Upgrade History Reconstructor](https://i.imgur.com/PLACEHOLDER.png)

## Overview

The Proxy Upgrade History Reconstructor is designed to help developers, auditors, and researchers analyze upgradeable smart contracts on BSC. It automatically detects proxy contract types (EIP-1967, Beacon, Custom) and reconstructs the complete upgrade history by scanning blockchain events.

## Features

- 🔍 **Automatic Proxy Detection**: Identifies proxy contract types using EIP-1967 storage slots
- 📊 **Complete Upgrade History**: Reconstructs all upgrade events from blockchain history
- 🎨 **Modern Dark Mode UI**: Beautiful, intuitive interface for visualizing upgrade history
- ⚡ **Real-time Analysis**: Fast analysis of proxy contracts on BSC
- 📝 **Detailed Event Information**: Shows timestamps, transaction hashes, and implementation addresses
- 🔐 **Security Focused**: Helps identify and audit upgradeable contract patterns

## How It Works

1. **Proxy Detection**: Reads EIP-1967 storage slots to identify proxy type and current implementation
2. **Event Scanning**: Searches for upgrade-related events (`Upgraded`, `ImplementationChanged`, `AdminChanged`, `BeaconUpgraded`)
3. **History Reconstruction**: Combines storage slot data with event logs to build complete upgrade timeline
4. **Visualization**: Displays results in an easy-to-understand format

## Installation

### Quick Start (Recommended)

Run the setup script to automatically configure everything:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install all dependencies
- Create a `.env` file with pre-configured BSC RPC URL
- Build the TypeScript project
- Run tests to verify everything works

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Usage

### Web UI (Recommended)

1. Start the server:
```bash
npm run server
```

2. Open your browser to `http://localhost:3000`

3. Enter a proxy contract address and click "Analyze Proxy"

### Command Line

```bash
# Basic usage
npm start <proxy-address>

# With block range
npm start <proxy-address> <from-block> <to-block>

# Example
npm start 0x1234567890123456789012345678901234567890 0 latest
```

## Project Structure

```
proxy-upgrade-history-reconstructor/
├── app.ts              # Main application logic
├── app.test.ts         # Unit tests
├── server.js           # Express server for web UI
├── index.html          # Frontend UI
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
├── setup.sh            # Setup script
└── README.md           # This file
```

## API Endpoints

### GET /api/reconstruct

Reconstruct upgrade history for a proxy contract.

**Query Parameters:**
- `address` (required): Proxy contract address
- `fromBlock` (optional): Starting block number
- `toBlock` (optional): Ending block number or 'latest'

**Response:**
```json
{
  "proxyInfo": {
    "proxyAddress": "0x...",
    "currentImplementation": "0x...",
    "currentAdmin": "0x...",
    "proxyType": "EIP-1967",
    "isProxy": true
  },
  "upgradeEvents": [...],
  "totalUpgrades": 3,
  "firstUpgradeBlock": 12345,
  "lastUpgradeBlock": 67890
}
```

## Supported Proxy Types

- **EIP-1967**: Standard proxy pattern with implementation slot
- **Beacon**: Beacon proxy pattern
- **Custom**: Non-standard proxy implementations
- **Unknown**: Contracts that don't match known patterns

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Development

Run in development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Technical Details

### EIP-1967 Storage Slots

- **Implementation Slot**: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- **Admin Slot**: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
- **Beacon Slot**: `0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50`

### Event Signatures

The tool searches for these common upgrade events:
- `Upgraded(address indexed implementation)`
- `Upgraded(address indexed implementation, address indexed admin)`
- `ImplementationChanged(address indexed oldImplementation, address indexed newImplementation)`
- `AdminChanged(address indexed previousAdmin, address indexed newAdmin)`
- `BeaconUpgraded(address indexed beacon)`

## Use Cases

- **Security Auditing**: Verify upgrade transparency and track contract changes
- **Contract Analysis**: Understand how upgradeable contracts have evolved
- **Research**: Study upgrade patterns across different protocols
- **Due Diligence**: Analyze proxy contracts before interacting with them

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Contributions and improvements are welcome!

## Disclaimer

This tool is for educational and analysis purposes only. Always verify contract information independently before making any financial decisions.




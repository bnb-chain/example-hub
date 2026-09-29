# State Growth Inspector

A powerful tool to analyze and monitor blockchain state growth on BNBChain (BSC). This inspector helps identify state bloat, track storage usage, and detect potential issues with contract state management.

![State Growth Inspector UI](https://i.imgur.com/PLACEHOLDER.png)

## Overview

Blockchain state refers to the storage data maintained by smart contracts. Each contract can store data in storage slots, and excessive growth of this state can lead to:

- Increased node storage requirements
- Higher gas costs for state operations
- Network performance degradation
- Potential state bloat issues

The State Growth Inspector provides comprehensive analysis tools to monitor and understand how contract state evolves over time.

## Features

- **Contract State Analysis**: Analyze storage slots, code size, and storage density
- **Growth Tracking**: Monitor state growth over multiple blocks
- **Trend Analysis**: Identify increasing, decreasing, or stable growth patterns
- **Risk Assessment**: Automatic risk level calculation (LOW, MEDIUM, HIGH)
- **Contract Comparison**: Compare state between two contracts
- **Visual Charts**: Interactive charts showing growth trends
- **Modern Dark UI**: Beautiful, user-friendly interface

## Installation

### Quick Start

Run the setup script to clone and configure the project:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install all dependencies
- Create a `.env` file with working BSC RPC configuration
- Build the project
- Run tests to verify everything works

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
PORT=3000
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

### Web UI

Start the server:
```bash
npm start
```

Then open your browser to `http://localhost:3000` to access the web interface.

The UI provides three main features:

1. **Analyze State**: Get detailed information about a contract's current state
2. **Growth Analysis**: Track state changes over a range of blocks
3. **Compare Contracts**: Compare the state of two contracts side-by-side

### CLI Usage

Analyze a single contract:
```bash
npm start <contract-address>
```

Analyze state growth over block range:
```bash
npm start <contract-address> <start-block> <end-block>
```

Example:
```bash
npm start 0x10ED43C718714eb63d5aA57B78B54704E256024E 35000000 36000000
```

## API Endpoints

The server exposes REST API endpoints:

### POST /api/analyze
Analyze contract state.

Request:
```json
{
  "contractAddress": "0x...",
  "maxSlots": 100
}
```

Response:
```json
{
  "address": "0x...",
  "codeSize": 12345,
  "storageSlots": [...],
  "nonEmptySlots": 42,
  "totalSlotsChecked": 100,
  "storageDensity": 42.0
}
```

### POST /api/growth
Analyze state growth over block range.

Request:
```json
{
  "contractAddress": "0x...",
  "startBlock": 35000000,
  "endBlock": 36000000,
  "interval": 1000,
  "maxSlots": 100
}
```

Response:
```json
{
  "contractAddress": "0x...",
  "snapshots": [...],
  "growthRate": 0.001,
  "totalGrowth": 10,
  "isGrowing": true,
  "growthTrend": "INCREASING",
  "riskLevel": "MEDIUM",
  "riskReason": "..."
}
```

### POST /api/compare
Compare two contracts.

Request:
```json
{
  "contract1": "0x...",
  "contract2": "0x...",
  "maxSlots": 100
}
```

## How It Works

The inspector reads storage slots from smart contracts using the `eth_getStorageAt` RPC method. It analyzes:

- **Storage Density**: Percentage of non-empty slots
- **Growth Rate**: Slots added per block
- **Trend Analysis**: Whether growth is increasing, decreasing, or stable
- **Risk Assessment**: Based on growth rate and total growth

### Risk Levels

- **LOW**: Normal state growth patterns
- **MEDIUM**: Moderate growth that should be monitored
- **HIGH**: Rapid growth that may indicate state bloat

## Use Cases

- Monitor DeFi protocol state growth
- Detect potential state bloat in contracts
- Optimize contract storage usage
- Compare state efficiency between contracts
- Analyze storage patterns over time

## Example Contracts

Try analyzing these popular BSC contracts:

- PancakeSwap Router V2: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- PancakeSwap Router V3: `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4`
- BUSD Token: `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Technical Details

- **Language**: TypeScript
- **Blockchain**: BNBChain (BSC)
- **RPC**: Uses BSC public RPC endpoints
- **Framework**: Express.js for web server
- **Testing**: Jest with ts-jest

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Feel free to use it as a reference or starting point for your own projects.




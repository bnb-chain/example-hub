# Transaction Inclusion Latency Tracker

BNBChain Cookbook: Track and analyze transaction inclusion latency on BNB Smart Chain (BSC)

## Overview

This tool monitors and tracks the time it takes for transactions to be included in blocks on the BNB Smart Chain. Transaction inclusion latency is a critical metric for understanding network performance, user experience, and optimizing transaction strategies.

![Transaction Inclusion Latency Tracker UI](https://i.imgur.com/PLACEHOLDER.png)

## Features

- **Real-time Latency Tracking**: Monitor transaction inclusion times in real-time
- **Historical Statistics**: View average, min, and max latency across multiple transactions
- **Modern Dark Mode UI**: Beautiful, intuitive interface with split-pane design
- **Transaction History**: Keep track of recently monitored transactions
- **Comprehensive Metrics**: Detailed information about each transaction including block number, status, and timing

## How It Works

1. **Submit Transaction Hash**: Enter a transaction hash to monitor
2. **Track Inclusion**: The tool tracks when the transaction was submitted and when it gets included in a block
3. **Calculate Latency**: Measures the time difference between submission and inclusion
4. **Display Results**: Shows detailed statistics and history

## Installation

### Quick Start (Recommended)

Run the setup script to automatically configure the project:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install all dependencies
- Create a `.env` file with default BSC RPC endpoint
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

### Web Interface

Start the development server:

```bash
npm run dev
```

Or use the production build:

```bash
npm start
```

Then open your browser to `http://localhost:3000`

### CLI Usage

Monitor a specific transaction:

```bash
npm start <transaction-hash>
```

Example:
```bash
npm start 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## Project Structure

```
transaction-inclusion-latency-tracker/
├── app.ts              # Main application logic
├── app.test.ts         # Unit tests
├── index.html          # Web UI
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
├── setup.sh            # Setup script
└── README.md           # This file
```

## API

### Functions

#### `monitorTransaction(txHash: string): Promise<TransactionLatencyResult>`

Monitors a transaction by hash and returns latency information.

#### `trackTransactionLatency(txHash: string, submittedAt: number): Promise<TransactionLatencyResult>`

Tracks transaction latency from a specific submission time.

#### `calculateLatencyStats(results: TransactionLatencyResult[]): LatencyStats`

Calculates statistics from multiple transaction results.

### Types

```typescript
interface TransactionLatencyResult {
  txHash: string;
  submittedAt: number;
  includedAt: number | null;
  latencyMs: number | null;
  blockNumber: number | null;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

interface LatencyStats {
  totalTransactions: number;
  confirmedTransactions: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  pendingCount: number;
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Configuration

### Environment Variables

- `BSC_RPC_URL`: BSC RPC endpoint (default: `https://bsc-dataseed1.binance.org/`)

You can use any BSC RPC provider:
- Public endpoints: `https://bsc-dataseed1.binance.org/`
- Infura: `https://bsc-mainnet.infura.io/v3/YOUR_API_KEY`
- Alchemy: `https://bsc-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- Custom RPC endpoint

## Use Cases

- **Network Performance Monitoring**: Track average transaction inclusion times
- **Gas Price Optimization**: Analyze latency to optimize gas price strategies
- **Transaction Debugging**: Investigate why transactions are slow
- **User Experience Analysis**: Understand confirmation time patterns
- **DApp Development**: Monitor transaction performance in your applications

## BSC Network Information

- **Network**: BNB Smart Chain (BSC)
- **Chain ID**: 56
- **Average Block Time**: ~3 seconds
- **RPC Endpoint**: https://bsc-dataseed1.binance.org/

## Technologies Used

- **TypeScript**: Type-safe JavaScript
- **Ethers.js v6**: Ethereum/BSC library
- **Jest**: Testing framework
- **Node.js**: Runtime environment

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Feel free to use it as a reference or starting point for your own projects.

## Support

For issues or questions related to BNBChain, visit:
- [BNBChain Documentation](https://docs.bnbchain.org/)
- [BNBChain GitHub](https://github.com/bnb-chain)




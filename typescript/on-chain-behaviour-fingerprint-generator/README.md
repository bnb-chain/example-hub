# On-Chain Behavior Fingerprint Generator - BNBChain Cookbook

A tool that analyzes on-chain transaction patterns of addresses on BNB Smart Chain (BSC) to generate unique behavioral fingerprints. The fingerprint captures transaction patterns, timing, interaction types, and other behavioral characteristics to create a unique signature for each address.

![On-Chain Behavior Fingerprint Generator UI](https://i.imgur.com/placeholder.png)

## Overview

The On-Chain Behavior Fingerprint Generator analyzes transaction history to identify behavioral patterns and generate a unique SHA-256 fingerprint. This can help identify:

- **Bot Activity**: Automated trading bots with distinct high-frequency, low-value patterns
- **DEX Traders**: Addresses with frequent DEX router interactions
- **Whales**: High-net-worth addresses with large value transfers
- **Contract Interactors**: Addresses that frequently interact with smart contracts
- **Risk Assessment**: Unusual patterns that may indicate suspicious activity

## Features

- 🔍 **Transaction Analysis**: Analyzes transaction history from recent blocks
- 🔐 **Unique Fingerprints**: Generates SHA-256 hashes from behavioral signatures
- 📊 **Behavior Classification**: Automatically classifies addresses into behavior types
- ⚠️ **Risk Scoring**: Calculates risk scores (0-100) based on activity patterns
- 🌙 **Modern Dark Mode UI**: Beautiful, responsive interface with split-pane design
- 📈 **Detailed Metrics**: Comprehensive statistics on transaction patterns
- ✅ **Comprehensive Unit Tests**: Full test coverage for all functions

## Tech Stack

- **TypeScript**: Type-safe development
- **ethers.js v6**: Blockchain interaction
- **Jest**: Unit testing framework
- **Modern HTML/CSS/JS**: Frontend interface

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation & Setup

1. **Clone and setup** (one command):
   ```bash
   bash setup.sh
   ```

   This script will:
   - Install all dependencies
   - Create a `.env` file with working BSC RPC configuration
   - Build the TypeScript code
   - Run tests to verify everything works

2. **Run the application**:

   **Option A: Web UI (Recommended)**
   - Open `index.html` in a modern web browser
   - Enter a BSC address to analyze
   - Optionally specify block range (default: 10,000 blocks)
   - Click "Generate Fingerprint"

   **Option B: CLI**
   ```bash
   npm start <address> [block-range]
   ```

   Example:
   ```bash
   npm start 0x1234567890123456789012345678901234567890
   npm start 0x1234567890123456789012345678901234567890 5000
   ```

## Project Structure

```
on-chain-behaviour-fingerprint-generator/
├── app.ts              # Main TypeScript application logic
├── app.test.ts         # Unit tests
├── index.html          # Frontend UI
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
├── setup.sh            # One-command setup script
├── env.template        # Environment variables template
└── README.md           # This file
```

## Usage Examples

### Generating a Fingerprint via Web UI

1. Open `index.html` in your browser
2. Enter a BSC wallet address (e.g., `0x1234...`)
3. Optionally adjust the block range (default: 10,000 blocks)
4. Click "Generate Fingerprint"
5. Review the unique fingerprint, behavior type, risk score, and detailed metrics

### CLI Usage

```bash
# Generate fingerprint with default block range (10,000 blocks)
npm start 0x1234567890123456789012345678901234567890

# Generate fingerprint with custom block range
npm start 0x1234567890123456789012345678901234567890 5000
```

## Behavior Types

The tool automatically classifies addresses into one of these behavior types:

- **NORMAL**: Standard user behavior with typical transaction patterns
- **DEX_TRADER**: High frequency of DEX router interactions (>30% of transactions)
- **WHALE**: Large value transactions (average > 100 BNB)
- **BOT**: High transaction frequency (>50 tx/day) with low values (<0.001 BNB avg)
- **CONTRACT_INTERACTOR**: Frequent interactions with many unique contracts (>20) and contract creations
- **UNKNOWN**: Insufficient data to classify behavior

## Fingerprint Components

The fingerprint is a SHA-256 hash generated from a signature string containing:

- Transaction count and frequency
- Number of unique contracts and tokens interacted with
- DEX interaction patterns
- Active hours and days of activity (UTC)
- Behavior classification type

### Example Signature

```
TX:150|FREQ:25.50|CONTRACTS:12|TOKENS:5|DEX:45|TYPE:DEX_TRADER|HOURS:8,9,10,14,15|DAYS:1,2,3,4,5
```

## Risk Score

The risk score (0-100) indicates potential suspicious activity based on:

- **High Transaction Frequency**: >100 tx/day (+20 points), >50 tx/day (+10 points)
- **Contract Creations**: >5 creations (+15 points)
- **Gas Price Irregularities**: Very high (>10 Gwei) or very low (<1 Gwei) (+10 points)
- **Irregular Activity Patterns**: Few active hours (<3) with many transactions (+15 points)
- **Behavior Type**: BOT classification (+25 points), UNKNOWN with no transactions (+30 points)

Risk levels:
- **0-24**: Low risk (normal behavior)
- **25-49**: Medium risk (some anomalies)
- **50-74**: High risk (suspicious patterns)
- **75-100**: Critical risk (highly suspicious)

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

All tests should pass. The test suite covers:
- Provider initialization
- Contract detection
- Transaction fetching
- Behavior metrics calculation
- Behavior type classification
- Risk score calculation
- Signature and fingerprint generation
- Error handling

## Configuration

### Environment Variables

The `.env` file (created by `setup.sh`) contains:

```env
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
```

You can customize the RPC endpoint if needed. Alternative BSC RPC endpoints:
- `https://bsc-dataseed2.binance.org/`
- `https://bsc-dataseed3.binance.org/`
- `https://bsc-dataseed4.binance.org/`
- Or use a custom RPC provider like Infura, Alchemy, etc.

### Block Range

The default block range is 10,000 blocks (approximately 3-4 days on BSC). You can adjust this:
- **Smaller range** (1,000-5,000): Faster analysis, less historical data
- **Larger range** (20,000-50,000): More comprehensive analysis, slower processing

## Limitations

- Analysis is based on recent blocks only (not full historical data)
- Transaction fetching may be rate-limited by RPC provider
- Token transfer detection relies on Transfer event logs
- Requires active RPC connection to BSC network
- Large block ranges may take significant time to process

## Use Cases

- **Security Analysis**: Identify potentially suspicious addresses
- **Bot Detection**: Detect automated trading bots
- **Address Clustering**: Group addresses with similar behavioral patterns
- **Risk Assessment**: Evaluate addresses before interactions
- **Research**: Study on-chain behavior patterns
- **Compliance**: Monitor transaction patterns for regulatory purposes

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Feel free to use it as a reference for building similar tools.

## Support

For issues related to:
- **BNBChain/BSC**: [BNBChain Documentation](https://docs.bnbchain.org/)
- **ethers.js**: [ethers.js Documentation](https://docs.ethers.org/)

---

**Note**: This tool connects to public BSC RPC endpoints. For production use, consider using a dedicated RPC provider for better reliability and rate limits. The fingerprint is deterministic - the same address with the same transaction history will always generate the same fingerprint.




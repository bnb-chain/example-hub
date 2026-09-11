# Event Entropy Analyzer - Spam Detection

A powerful tool for detecting spam patterns in blockchain events on the BNB Smart Chain (BSC) by analyzing event entropy and patterns.

![Event Entropy Analyzer UI](https://i.imgur.com/PLACEHOLDER.png)

## Overview

The Event Entropy Analyzer examines Transfer or Approval events from smart contracts and uses Shannon entropy calculations to identify suspicious patterns that indicate automated spam activity. By measuring the randomness and diversity of event data, the tool can distinguish between legitimate activity and spam.

## Features

- **Entropy Analysis**: Calculates Shannon entropy for addresses and values to measure diversity
- **Pattern Detection**: Identifies repeated addresses, values, and sequential block patterns
- **Spam Scoring**: Combines entropy and patterns into a 0-100 spam likelihood score
- **Visual Interface**: Modern dark mode UI with interactive analysis
- **Comprehensive Testing**: Full unit test coverage ensuring reliability

## How It Works

### Entropy Calculation

Entropy measures the randomness or diversity in a dataset:
- **High Entropy**: Diverse addresses and values → Legitimate activity
- **Low Entropy**: Repetitive patterns → Potential spam

The tool uses Shannon entropy formula: `H(X) = -Σ P(x) * log2(P(x))`

### Spam Indicators

The analyzer detects several spam patterns:
- Many events from the same address (bot activity)
- Many events to the same address (airdrop spam)
- Identical values across many events
- Events occurring in sequential blocks
- Low unique address ratio

### Spam Score Calculation

The spam score (0-100) combines:
- **Entropy Component** (40 points): Lower entropy = higher spam score
- **Repetition Component** (30 points): Higher repetition = higher spam score
- **Sequential Blocks** (20 points): More sequential blocks = higher spam score
- **Unique Address Ratio** (10 points): Lower ratio = higher spam score

## Installation

### Quick Start

Run the setup script to automatically configure the project:

```bash
chmod +x setup.sh
./setup.sh
```

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

## Usage

### Command Line

Analyze events from a contract:

```bash
npm start <contract-address> [Transfer|Approval] [from-block] [to-block]
```

Example:
```bash
npm start 0x55d398326f99059fF775485246999027B3197955 Transfer 35000000 35001000
```

### Web Interface

1. Start the server:
```bash
npm run serve
```

2. Open your browser to `http://localhost:8080`

3. Enter:
   - Contract address (BSC address)
   - Event type (Transfer or Approval)
   - Block range (from and to blocks)

4. Click "Analyze Events" to see the results

The server provides both the web UI and a REST API endpoint at `/api/analyze`

## Project Structure

```
event-entropy-analyzer-spam-detection/
├── app.ts              # Main application logic
├── app.test.ts         # Unit tests
├── index.html          # Web interface
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest configuration
├── setup.sh            # Setup script
└── README.md           # This file
```

## API Reference

### Main Functions

#### `analyzeContractEvents(contractAddress, eventType, fromBlock, toBlock, provider?)`

Analyzes events from a contract and returns entropy analysis.

**Parameters:**
- `contractAddress`: BSC contract address
- `eventType`: 'Transfer' or 'Approval'
- `fromBlock`: Starting block number
- `toBlock`: Ending block number
- `provider`: Optional ethers provider

**Returns:** `AnalysisResult` with events and analysis

#### `calculateEntropy(values: string[]): number`

Calculates Shannon entropy for a set of values.

#### `analyzeEventEntropy(events: EventData[]): EntropyAnalysis`

Performs complete entropy analysis on events.

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Spam Level Classification

- **LOW** (0-39): Normal activity, no significant spam indicators
- **MEDIUM** (40-59): Some suspicious patterns detected
- **HIGH** (60-79): Strong spam indicators present
- **CRITICAL** (80-100): Very high likelihood of spam activity

## Use Cases

- Detect spam token transfers
- Identify bot-driven activity
- Monitor contract health
- Security analysis and auditing
- Airdrop spam detection

## Technical Details

- **Network**: BNB Smart Chain (BSC)
- **Language**: TypeScript
- **Framework**: ethers.js v6
- **Testing**: Jest with ts-jest

## Environment Variables

- `BSC_RPC_URL`: BSC RPC endpoint (default: https://bsc-dataseed1.binance.org/)

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Feel free to use and modify as needed.


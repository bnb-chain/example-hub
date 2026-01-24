# Block Producer Fairness Monitor

A BNBChain Cookbook example that monitors block producer fairness on the BNB Smart Chain (BSC) network. This tool analyzes recent blocks to detect potential imbalances in validator distribution and helps ensure network decentralization.

![Block Producer Fairness Monitor](https://i.imgur.com/PLACEHOLDER.png)

## Overview

The Block Producer Fairness Monitor fetches recent blocks from BSC, identifies the producer (validator) for each block, and calculates distribution statistics to measure fairness. It uses the Gini coefficient to quantify inequality and highlights any significant deviations from expected block distribution.

## Features

- 🔍 **Real-time Block Analysis**: Fetches and analyzes recent blocks from BSC
- 📊 **Fairness Metrics**: Calculates Gini coefficient and deviation statistics
- 🎨 **Modern Dark Mode UI**: Beautiful, responsive interface with split-pane design
- 📈 **Visual Distribution**: Charts and tables showing block producer statistics
- ✅ **Fairness Detection**: Automatically determines if distribution is fair or imbalanced

## Tech Stack

- **TypeScript**: Type-safe development
- **Ethers.js v6**: Blockchain interaction
- **Express**: Web server for API and static files
- **Jest**: Unit testing framework

## Prerequisites

- Node.js 18+ and npm
- Access to BSC RPC endpoint (public or private)

## Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install all dependencies
- Create a `.env` file with pre-configured RPC URL
- Build the TypeScript project
- Run tests to verify everything works

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp env.example .env
   ```
   
   Or create `.env` manually with:
   ```
   BSC_RPC_URL=https://bsc-dataseed1.binance.org/
   PORT=3000
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Launch the application** - The server starts on port 3000 by default
2. **Configure block count** - Enter the number of recent blocks to analyze (10-1000)
3. **Click "Analyze Blocks"** - The tool fetches blocks and calculates statistics
4. **Review results** - View fairness metrics, Gini coefficient, and producer distribution

## Understanding the Metrics

### Gini Coefficient
- **Range**: 0 to 1
- **0**: Perfect equality (all producers have equal blocks)
- **1**: Maximum inequality (one producer has all blocks)
- **Threshold**: < 0.3 is considered fair

### Max Deviation
- The largest difference between actual and expected block count
- Expected = Total Blocks / Number of Unique Producers

### Fairness Status
- **Fair**: Gini < 0.3 AND max deviation < 20% of expected
- **Unfair**: Either condition is violated

## API Endpoints

### GET `/api/analyze?blockCount=100`
Analyzes block producer fairness for the specified number of recent blocks.

**Query Parameters:**
- `blockCount` (optional): Number of blocks to analyze (default: 100, min: 10, max: 1000)

**Response:**
```json
{
  "totalBlocks": 100,
  "uniqueProducers": 5,
  "giniCoefficient": 0.15,
  "maxDeviation": 2.5,
  "isFair": true,
  "producers": [
    {
      "address": "0x...",
      "blockCount": 22,
      "percentage": 22.0,
      "expectedBlocks": 20.0,
      "deviation": 2.0
    }
  ]
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
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

The test suite includes:
- Gini coefficient calculations
- Address formatting
- Block fetching logic
- Fairness analysis
- Distribution calculations

## Project Structure

```
block-producer-fairness-monitor/
├── app.ts                 # Main application logic
├── app.test.ts            # Unit tests
├── public/
│   └── index.html         # Frontend UI
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── jest.config.js
├── setup.sh               # Setup script
├── .env.example           # Environment variables template
└── README.md
```

## Development

### Development Mode
Run with hot reload using ts-node:
```bash
npm run dev
```

### Building
Compile TypeScript to JavaScript:
```bash
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BSC_RPC_URL` | BSC RPC endpoint URL | `https://bsc-dataseed1.binance.org/` |
| `PORT` | Server port | `3000` |

## Limitations

- Analysis is based on recent blocks only (not historical)
- Fairness thresholds are configurable but use default values
- Requires active RPC connection to BSC network
- Block fetching may be rate-limited by RPC provider

## Contributing

This is a BNBChain Cookbook example project. Feel free to:
- Report issues
- Suggest improvements
- Submit pull requests

## License

MIT

## Related Resources

- [BNBChain Documentation](https://docs.bnbchain.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [BSC Network Info](https://www.bnbchain.org/)


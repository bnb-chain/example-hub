# Contract Surface Area Analyzer

BNBChain Cookbook: Analyzer to evaluate smart contract surface area and attack surface on BSC

## Overview

The Contract Surface Area Analyzer is a tool designed to analyze smart contracts deployed on BNB Smart Chain (BSC) to assess their attack surface and complexity. Understanding a contract's surface area is crucial for security auditing, as it helps identify potential attack vectors and complexity hotspots.

![Contract Surface Area Analyzer UI](https://i.imgur.com/PLACEHOLDER.png)

## What is Surface Area?

The **surface area** of a smart contract refers to all the ways it can be interacted with from the outside:

- **Public Functions** - Can be called internally and externally
- **External Functions** - Can only be called from outside the contract
- **Payable Functions** - Can receive ETH/BNB, increasing financial risk
- **Events** - Emitted data that can be monitored
- **Fallback/Receive** - Special functions for handling unexpected calls

## Features

- 🔍 Analyze contract functions, events, and special functions
- 📊 Calculate complexity scores based on contract structure
- ⚠️ Identify risk factors and potential security concerns
- 🔗 Detect proxy patterns (EIP-1967)
- 🎨 Modern dark mode UI for easy visualization
- ✅ Comprehensive unit test coverage

## Installation

### Quick Setup

Run the setup script for a hassle-free installation:

```bash
chmod +x setup.sh
./setup.sh
```

### Manual Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contract-surface-area-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Configure your BSC RPC URL in `.env`:
```
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
```

## Usage

### Command Line

Analyze a contract by providing its address:

```bash
npm start 0x55d398326f99059fF775485246999027B3197955
```

Optionally specify a contract type for better analysis:

```bash
npm start 0x55d398326f99059fF775485246999027B3197955 ERC20
```

Available contract types:
- `ERC20` - ERC-20 Token standard
- `ERC721` - ERC-721 NFT standard
- `ERC1155` - ERC-1155 Multi-Token standard
- `UNISWAP_V2` - Uniswap V2 Router
- `UNISWAP_V3` - Uniswap V3 Router

### Web Interface

1. Open `frontend.html` in your web browser
2. Enter a contract address on BSC
3. Optionally select a contract type
4. Click "Analyze Contract" to view the results

### Development Mode

Run in development mode with hot reload:

```bash
npm run dev
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

## Project Structure

```
contract-surface-area-analyzer/
├── app.ts                 # Main application logic
├── app.test.ts         # Unit tests
├── frontend.html       # Web UI interface
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
├── setup.sh            # Setup script
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Key Metrics

### Complexity Score

A weighted score that considers:
- Number of functions (base score)
- Public/external functions (higher weight)
- Payable functions (highest weight)
- Events (moderate weight)
- Fallback/receive functions (significant weight)

### Risk Factors

The analyzer identifies potential security concerns:
- High number of public/external functions
- Multiple payable functions
- Presence of fallback/receive functions
- Proxy pattern usage

## Example Contracts

- **USDT (BSC)**: `0x55d398326f99059fF775485246999027B3197955`
- **PancakeSwap Router V2**: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- **BNB**: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`

## API Reference

### `analyzeContractSurfaceArea(contractAddress: string, abi?: InterfaceAbi)`

Analyzes a contract's surface area and returns detailed information.

**Parameters:**
- `contractAddress`: The contract address to analyze
- `abi`: Optional ABI for the contract

**Returns:** `Promise<SurfaceAreaAnalysis>`

### `analyzeABI(abi: InterfaceAbi)`

Extracts functions, events, and special functions from an ABI.

**Parameters:**
- `abi`: The contract ABI

**Returns:** Analysis object with functions, events, and flags

### `calculateComplexityScore(analysis: {...})`

Calculates a complexity score based on contract structure.

**Parameters:**
- `analysis`: Object containing function and event counts

**Returns:** `number` - Complexity score

## Technologies

- **TypeScript** - Type-safe JavaScript
- **Ethers.js v6** - Ethereum library for BSC interaction
- **Jest** - Testing framework
- **Node.js** - Runtime environment

## License

MIT

## Contributing

This is a BNBChain Cookbook example project. Contributions and improvements are welcome!

## Disclaimer

This tool is for educational and analysis purposes only. Always conduct thorough security audits before deploying or interacting with smart contracts.



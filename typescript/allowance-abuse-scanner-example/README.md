# Allowance Abuse Scanner - BNBChain Cookbook

A security tool to scan and identify potentially risky ERC-20 token allowances on BNB Smart Chain (BSC). This scanner helps users detect excessive or dangerous token permissions that could put their assets at risk.

![Allowance Abuse Scanner UI](https://i.imgur.com/placeholder.png)

## Overview

Token allowances allow one address (spender) to transfer tokens on behalf of another address (owner). While this is essential for DeFi interactions, excessive or infinite allowances can pose significant security risks. This tool scans wallet addresses to identify:

- **CRITICAL**: Infinite or near-infinite allowances
- **HIGH**: Allowances significantly exceeding balance or very large absolute values
- **MEDIUM**: Allowances exceeding balance or granted to contracts
- **LOW**: Allowances within reasonable limits

## Features

- 🔍 Scan common BSC tokens (USDT, BUSD, USDC, ETH, BTCB, CAKE, DAI)
- 🎯 Check specific spender addresses (DEX routers, contracts, etc.)
- ⚠️ Risk assessment with detailed explanations
- 🌙 Modern dark mode UI with intuitive design
- 📊 Summary statistics and detailed allowance cards
- ✅ Comprehensive unit test coverage

## Tech Stack

- **TypeScript**: Type-safe development
- **ethers.js v6**: Blockchain interaction
- **Jest**: Unit testing
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
   - Enter a wallet address to scan
   - Optionally add custom spender addresses
   - Click "Scan Allowances"

   **Option B: CLI**
   ```bash
   npm start <owner-address> [spender-address-1] [spender-address-2] ...
   ```

   Example:
   ```bash
   npm start 0x1234567890123456789012345678901234567890
   ```

## Project Structure

```
allowance-abuse-scanner-example/
├── app.ts              # Main TypeScript application logic
├── app.test.ts         # Unit tests
├── index.html          # Frontend UI
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Jest test configuration
├── setup.sh            # One-command setup script
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Usage Examples

### Scanning a Wallet

1. Open `index.html` in your browser
2. Enter a BSC wallet address (e.g., `0x1234...`)
3. Click "Scan Allowances"
4. Review the results showing all active token allowances with risk assessments

### Checking Specific Spenders

1. Enter the owner address
2. Add spender addresses in the "Custom Spenders" field (e.g., DEX router addresses)
3. Click "Scan Allowances"
4. View allowances for the specified spenders only

### CLI Usage

```bash
# Scan common tokens and default spenders
npm start 0x1234567890123456789012345678901234567890

# Scan with custom spenders
npm start 0x1234567890123456789012345678901234567890 \
  0x10ED43C718714eb63d5aA57B78B54704E256024E \
  0x13f4EA83D0bd40E75C8222255bc855a974568Dd4
```

## Risk Assessment Logic

The scanner evaluates each allowance based on:

1. **Infinite Allowance Detection**: Checks for `MAX_UINT256` or near-max values
2. **Balance Comparison**: Compares allowance to current token balance
3. **Absolute Value**: Flags very large allowances (> 1M tokens)
4. **Spender Type**: Considers whether spender is a contract or EOA
5. **Ratio Analysis**: Calculates allowance-to-balance ratios

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
- Token information retrieval
- Risk level calculation
- Allowance scanning logic
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

## Supported Tokens

The scanner checks these common BSC tokens by default:
- USDT (Tether USD)
- BUSD (Binance USD)
- USDC (USD Coin)
- ETH (Ethereum)
- BTCB (Bitcoin BEP20)
- CAKE (PancakeSwap)
- DAI (Dai Stablecoin)

## Common Spenders Checked

By default, the scanner checks allowances for:
- PancakeSwap Router V2
- PancakeSwap Router V3
- 1inch Router

You can add custom spender addresses via the UI or CLI.

## Security Considerations

⚠️ **Important**: This tool is for informational purposes only. It helps identify potential risks but does not:
- Revoke allowances automatically
- Guarantee complete security coverage
- Replace professional security audits

Always review allowances carefully and revoke unnecessary permissions through your wallet interface.

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

**Note**: This tool connects to public BSC RPC endpoints. For production use, consider using a dedicated RPC provider for better reliability and rate limits.



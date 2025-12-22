# BNB Lending Protocol MVP

A decentralized lending and borrowing protocol built on BNB Chain for the BNB Chain Cookbook Hackathon. Users can supply stablecoins to earn interest and borrow against their collateral.

## 🏗️ Project Structure

```
LENDINGPROTOCOL/
├── contracts/           # Foundry smart contracts
│   ├── src/
│   │   ├── LendingPool.sol
│   │   ├── MockToken.sol
│   │   ├── SimplePriceOracle.sol
│   │   └── ChainlinkPriceOracle.sol
│   ├── test/
│   └── script/
├── frontend/            # Next.js frontend
│   ├── app/
│   ├── components/
│   └── config/
└── README.md
```

## ✨ Features

### Smart Contracts
- **LendingPool**: Core lending protocol with deposit, withdraw, borrow, and repay functions
- **Health Factor System**: 75% collateralization ratio (LTV)
- **Mock Tokens**: mUSDC and mBNB for testing
- **Dual Oracle Support**:
  - SimplePriceOracle for testnet deployment
  - ChainlinkPriceOracle for mainnet fork testing
- **Comprehensive Test Suite**: Unit tests and mainnet fork tests

### Frontend
- **BNB-Themed UI**: Golden/yellow theme with glassmorphism effects
- **RainbowKit Integration**: Seamless wallet connection to BSC Testnet
- **Dashboard**: Real-time display of supplied assets, borrowed amounts, and health factor
- **Interactive Modals**: Supply, withdraw, borrow, and repay with approval flow
- **Responsive Design**: Mobile-friendly interface

## 🧪 Smart Contract Testing

### Prerequisites
```bash
cd contracts
```

### Unit Tests
Run the standard unit tests:
```bash
forge test
```

Run with verbosity:
```bash
forge test -vvv
```

### Mainnet Fork Tests (with Chainlink Oracle)
The fork tests use real Chainlink price feeds from BSC Mainnet:

1. Set up your environment:
```bash
cp .env.example .env
# Edit .env and add: BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

2. Run fork tests:
```bash
forge test --match-path test/LendingPoolFork.t.sol --fork-url $BSC_RPC_URL -vv
```

**Note**: Fork tests utilize:
- BNB/USD Chainlink Feed: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`
- USDT/USD Chainlink Feed: `0xB97Ad0E74fa7d920791E90258A6E2085088b4320`
- Real WBNB and USDT tokens from BSC Mainnet

## 🚀 Deployment

### BSC Testnet Deployment

1. Configure your environment:
```bash
cd contracts
cp .env.example .env
```

2. Add the following to `.env`:
```bash
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_api_key_here  # Optional, for verification
```

3. Deploy the contracts:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $BSC_TESTNET_RPC_URL --broadcast --verify
```

4. Save the deployed contract addresses from the output.

### Update Frontend with Deployed Addresses

After deployment, update `/frontend/config/addresses.ts`:

```typescript
export const CONTRACTS = {
  LENDING_POOL: '0xYourLendingPoolAddress',
  USDC: '0xYourMockUSDCAddress',
  BNB: '0xYourMockBNBAddress',
} as const;
```

## 💻 Frontend Setup

### Install Dependencies
```bash
cd frontend
npm install
```

### Configure WalletConnect (Optional)
Get a Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com) and update `/frontend/config/wagmi.ts`:

```typescript
projectId: 'YOUR_PROJECT_ID'
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select your wallet (MetaMask, etc.)
   - Switch to BSC Testnet

2. **Get Test Tokens**
   - The deployer minted tokens on deployment
   - Ask the admin to send you test mUSDC and mBNB tokens
   - Or you can call `mint()` directly if you deployed

3. **Supply Assets**
   - Click "Supply" on any asset card
   - Enter amount
   - Approve token (first time only)
   - Confirm supply transaction

4. **Borrow Assets**
   - Ensure you have sufficient collateral (supplied assets)
   - Click "Borrow" on desired asset
   - Enter amount (max 75% of collateral value)
   - Confirm borrow transaction

5. **Monitor Health Factor**
   - Keep health factor > 1.0
   - Health factor = Total Collateral / Total Borrowed
   - If < 1.0, you may be liquidated (not implemented in MVP)

6. **Repay & Withdraw**
   - Repay borrowed assets to improve health factor
   - Withdraw supplied assets (if health factor allows)

## 🔑 Key Contract Functions

### LendingPool

```solidity
// Deposit tokens as collateral
function deposit(address token, uint256 amount) external

// Withdraw deposited tokens
function withdraw(address token, uint256 amount) external

// Borrow tokens against collateral
function borrow(address token, uint256 amount) external

// Repay borrowed tokens
function repay(address token, uint256 amount) external

// Get user's account information
function getAccountInfo(address user) external view 
    returns (uint256 totalCollateralValue, uint256 totalBorrowedValue)
```

## 🛡️ Security Considerations

⚠️ **This is a hackathon MVP and NOT production-ready**:

- No formal audit conducted
- Simplified interest rate model (no accrual implemented)
- No liquidation mechanism
- SimplePriceOracle is centralized
- Mock tokens for testing only
- Missing advanced features (flash loans, governance, etc.)

## 📚 Technology Stack

### Smart Contracts
- **Foundry**: Development framework
- **Solidity 0.8.13**: Smart contract language
- **Chainlink**: Price oracles (fork tests)
- **OpenZeppelin-style**: ERC20 implementation

### Frontend
- **Next.js 14**: React framework with App Router
- **Wagmi v2**: React hooks for Ethereum
- **Viem**: Ethereum library
- **RainbowKit**: Wallet connection UI
- **TailwindCSS**: Styling
- **TypeScript**: Type safety

## 🤝 Contributing

This is a hackathon project. Feel free to fork and improve!

## 📄 License

MIT License

## 🔗 Resources

- [BNB Chain Docs](https://docs.bnbchain.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Wagmi Docs](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)
- [Chainlink Price Feeds (BSC)](https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain)

---

Built with ❤️ for BNB Chain Cookbook Hackathon

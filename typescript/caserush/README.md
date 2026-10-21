# CaseRush

A provably fair CS:GO case opening dApp built on BNB Smart Chain featuring on-chain inventory management and automated BNB payouts.

![CaseRush](https://cms-static.bnbchain.org/dcms/static/303d0c6a-af8f-4098-a2d0-a5b96ef964ba.png)

## 🎮 Overview

CaseRush is a decentralized application (dApp) that brings the excitement of CS:GO case opening to the blockchain. Built on BNB Smart Chain, it features:

- **Provably Fair System**: Cryptographically verifiable randomness using server seed hash commitment
- **On-Chain Inventory**: All items won are stored on-chain with full ownership
- **Automated Payouts**: Instant BNB payments when selling items, no manual intervention
- **Transparent Economics**: Verified smart contract with public case odds (62.7% RTP)

## 🌐 Live Demo

- **Website**: [www.caserush.fun](https://www.caserush.fun)
- **Verified Contract**: [0x22F1e50762E8D069E18f223CDd114Ec7F586cCAD](https://bscscan.com/address/0x22F1e50762E8D069E18f223CDd114Ec7F586cCAD)
- **Network**: BSC Mainnet (Chain ID: 56)

## 🎲 How Provable Fairness Works

CaseRush implements a cryptographic commitment scheme to ensure fairness:

1. **Server Seed Hash**: The contract is initialized with a hash of the server's secret seed
2. **Client Seed**: Each player provides randomness through their transaction
3. **Combined Randomness**: Both seeds are combined to generate the outcome
4. **Verification**: After reveal, players can verify the original server seed matches the hash

This makes it mathematically impossible for either party to manipulate the outcome.

## 🏗️ Architecture

### Smart Contract (`CaseRush.sol`)

- **Solidity Version**: 0.8.20 with optimizer (200 runs)
- **Key Features**:
  - 7 unique items with different rarities (Common to Legendary)
  - Weighted probability system (total odds: 10,000)
  - On-chain inventory tracking per user
  - Automated sell-back mechanism with BNB payouts
  - Emergency pause functionality
  - Team fee distribution

### Frontend (Next.js + TypeScript)

- **Framework**: Next.js 16.0.0 with Turbopack
- **Wallet Integration**: Privy (supports MetaMask, WalletConnect, etc.)
- **UI**: Tailwind CSS with custom animations
- **Blockchain Interaction**: Ethers.js v6

## 📋 Prerequisites

- Node.js 18+ and npm
- BNB wallet (MetaMask recommended)
- BNB for gas fees

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nangs6610/caserush.git
cd caserush
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# BNB Chain Configuration
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
NEXT_PUBLIC_CONTRACT_ADDRESS=0x22F1e50762E8D069E18f223CDd114Ec7F586cCAD
```

For smart contract deployment, create a `.env` file:

```env
PRIVATE_KEY=your_deployer_private_key
TEAM_WALLET_ADDRESS=your_team_wallet
SERVER_SEED_HASH=your_server_seed_hash
BSCSCAN_API_KEY=your_bscscan_api_key
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🔧 Smart Contract Deployment

### Compile Contract

```bash
npx hardhat compile
```

### Deploy to BSC Mainnet

```bash
node scripts/deploy-mainnet-direct.js
```

### Verify on BscScan

```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> <TEAM_WALLET> <SERVER_SEED_HASH>
```

## 📊 Case Economics

### Item Probabilities

| Item | Rarity | Floor Price (BNB) | Probability | Expected Value |
|------|--------|------------------|-------------|----------------|
| P250 | Common | 0.0005 | 50% | 0.00025 |
| MP7 | Common | 0.001 | 20% | 0.0002 |
| M4A1-S | Uncommon | 0.002 | 15% | 0.0003 |
| AK-47 | Rare | 0.005 | 10% | 0.0005 |
| AWP | Epic | 0.01 | 3% | 0.0003 |
| Karambit | Legendary | 0.05 | 1.5% | 0.00075 |
| Butterfly | Legendary | 0.1 | 0.5% | 0.0005 |

- **Case Cost**: 0.002 BNB
- **Expected Return**: 0.00125 BNB (62.7%)
- **House Edge**: 37.3%

## 🛠️ Tech Stack

### Smart Contract
- Solidity 0.8.20
- Hardhat development environment
- OpenZeppelin Contracts (ReentrancyGuard)

### Frontend
- Next.js 16.0.0 (React 19)
- TypeScript
- Tailwind CSS
- Ethers.js v6
- Privy Authentication

### Infrastructure
- BNB Smart Chain (BSC Mainnet)
- Vercel (hosting)
- BscScan (contract verification)

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks on case opening and selling
- **Pausable**: Emergency stop mechanism for the contract
- **Access Control**: Team-only functions for critical operations
- **Gas Optimization**: Optimized loops and storage patterns
- **Verified Contract**: Public source code on BscScan

## 📝 Key Contract Functions

### User Functions

- `openCase(string clientSeed)`: Open a case with provided randomness
- `sellItem(uint256 inventoryIndex)`: Sell an item for instant BNB
- `getUserInventory(address user)`: View user's inventory

### Admin Functions

- `pause()` / `unpause()`: Emergency controls
- `withdrawTeamFees()`: Withdraw accumulated team fees
- `fundContract()`: Add liquidity for payouts

## 🎯 Use Cases

1. **Gaming dApps**: Template for blockchain-based gaming with provable fairness
2. **NFT Mechanics**: On-chain inventory management for collectibles
3. **DeFi Gaming**: Integration of DeFi concepts with gaming
4. **Web3 Education**: Learn smart contract development, randomness, and dApp building

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the GPL-3.0 License.

## 📧 Contact

- **Website**: [www.caserush.fun](https://www.caserush.fun)
- **GitHub**: [github.com/nangs6610/caserush](https://github.com/nangs6610/caserush)
- **Contract**: [BscScan](https://bscscan.com/address/0x22F1e50762E8D069E18f223CDd114Ec7F586cCAD)

## 🙏 Acknowledgments

- BNB Chain for the robust blockchain infrastructure
- Privy for seamless wallet authentication
- OpenZeppelin for secure smart contract libraries

---

**⚠️ Disclaimer**: This is a demonstration project. Gambling may be illegal in your jurisdiction. Use responsibly and only with funds you can afford to lose.

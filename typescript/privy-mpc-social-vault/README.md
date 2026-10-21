# MPC Social Vault 🛡️ (BNB Chain Hackathon)

<div align="center">

![BNB Chain](https://raw.githubusercontent.com/bnb-chain/icons/master/token/bnb.svg)

**A Next-Generation Family Treasury secured by Smart Contracts.**

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Deployment](#deployment)

</div>

---

## 🚀 The Feature

**MPC Social Vault** solves the "Key Anxiety" problem in crypto. It allows families, DAOs, or small teams to manage shared funds with **Social Logic** instead of just private keys.

- **Zero-Friction Access**: Login with Google/Email (via **Privy**). No seed phrases on the client side.
- **Smart Allowances**: Give your children or employees a daily spending limit (e.g., 50 tBNB/day) without giving them full access.
- **Panic/Social Recovery**: If the main owner loses access, a threshold of "Guardians" (Friends/Family) can vote to restore it.
- **BNB Optimized**: Built for the speed and low fees of BSC and opBNB.

## 🏗 Architecture

The system consists of three layers:

### 1. The Vault Contract (`contracts/src/SocialVault.sol`)
The "brain" of the system. It holds the funds and enforces rules:
- `withdraw(amount)`: Checks if the caller is the Owner or a Member within their `dailyLimit`.
- `initiateRecovery(newOwner)`: Allows guardians to vote.
- `addMember/removeMember`: Management functions.

### 2. The Auth Layer (Privy)
We use **Privy** to create a non-custodial wallet for the user using their Web2 credentials (Email, Google, Twitter). This wallet is recognized as the `Owner` of the Vault.

### 3. The Dashboard (`app/`)
A sleek, **BNB-Themed** Next.js application that:
- Connects via Privy.
- Reads contract state (Balance, Members) via Wagmi v2.
- Executes transactions via Viem v2.

## 📂 Project Structure

```bash
.
├── contracts/               # Foundry Smart Contract Environment
│   ├── src/
│   │   ├── SocialVault.sol  # Core Treasury Logic
│   │   └── VaultFactory.sol # Factory to deploy new Vaults
│   ├── script/              # Deployment Scripts
│   └── test/                # Unit Tests
├── app/                     # Next.js Frontend
│   ├── app/
│   │   ├── components/      # Privy Provider & UI Components
│   │   └── page.tsx         # Main Dashboard
│   ├── .env.local           # Production Config (Real Keys)
│   └── .env.example         # Template Config
└── README.md
```

## 🏁 Getting Started

### Prerequisites
- **Node.js** v18+
- **Foundry** (Forge)
- **Git**

### 1. Smart Contract Setup
```bash
cd contracts
forge install
forge build
forge test # Verify logic
```

### 2. Frontend Setup
```bash
cd app
npm install

# Setup Environment
cp .env.example .env.local
```

### 3. Configuration
Open `app/.env.local` and configure your keys:
1.  **`NEXT_PUBLIC_PRIVY_APP_ID`**: Get this from [Privy Dashboard](https://dashboard.privy.io/).
2.  **`NEXT_PUBLIC_VAULT_ADDRESS`**: This will be your contract address after deployment (see below).

### 4. Run Locally
```bash
npm run dev
# Visit http://localhost:3000
```

## 🛰 Deployment & Production

### Step 1: Deploy Contracts to BSC Testnet
1.  Create a `.env` in `contracts/` and add your deployment key:
    ```bash
    PRIVATE_KEY=your_private_key_with_bnb_funds
    ```
2.  Run the deployment script:
    ```bash
    cd contracts
    source .env
    forge script script/Deploy.s.sol --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 --broadcast
    ```
3.  **Copy the Deployed Address** from the console output (look for "VaultFactory deployed at").

### Step 2: Configure Frontend
1.  Paste the new address into `app/.env.local`:
    ```bash
    NEXT_PUBLIC_VAULT_ADDRESS=0xYourDeployedAddress...
    ```
2.  Restart the dev server (`npm run dev`) or build for production.

### Step 3: Build for Production
```bash
cd app
npm run build
npm start
```

## 🎨 Theme & UX
The frontend is designed with a **"Premium BNB"** aesthetic:
- **Black & Gold** color palette (`#F0B90B`).
- **Glassmorphism** for panels.
- **Responsive** mobile-first layout.

## 🏆 Innovation
This isn't just a wallet; it's a **Programmable Bank Account**. By combining MPC (for UX) with Smart Contracts (for Logic), we get the best of both Web2 and Web3.

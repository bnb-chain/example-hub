# 🏓 BNB Ping Pong DApp — Privy MPC Wallet Demo

This is a minimal web3 DApp that demonstrates how to use [Privy Embedded Wallets](https://www.privy.io) to interact with a smart contract on the **BNB Testnet**. Players can click **Ping** or **Pong**, which sends an on-chain transaction via Privy, updating the contract state.

## 📍 Demo Details

- **LIVE WEBSITE:** [BNB PING PONG DEMO](https://mpc-bnb-demo.netlify.app/)
- **Network:** BNB Chain Testnet (Chain ID: `97`)
- **Verified Contract Code:** [`0x52943bFb088221cd6E3181fbc19081A6B34be948`](https://testnet.bscscan.com/address/0x52943bFb088221cd6E3181fbc19081A6B34be948)
- **RPC URL:** `https://data-seed-prebsc-1-s1.binance.org:8545/`

## 📦 Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Ethers.js
- Privy Embedded Wallet SDK
- React Hot Toast

## 🛠 How to Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/bnb-pingpong.git
cd bnb-pingpong
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then update the following fields with your **Privy credentials**:

```
NEXT_PUBLIC_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
PRIVY_APP_SECRET=YOUR_PRIVY_APP_SECRET
```

### 4. Create a Privy Project

1. Go to [https://www.privy.io](https://www.privy.io)
2. Create a new account or log in
3. Create a new app
4. Enable:
   - Embedded Wallet
   - Email 
   - Social Media Logins
5. Copy your:
   - **App ID** → use for `NEXT_PUBLIC_PRIVY_APP_ID`
   - **App Secret** → use for `PRIVY_APP_SECRET`
6. Add `http://localhost:3000` to the allowed origins in your Privy dashboard

### 5. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📄 Smart Contract ABI

```solidity
function ping() external;
function pong() external;
function pingCount() view returns (uint256);
function pongCount() view returns (uint256);
function nextMove() view returns (string);
```

## 🔔 UX Notes

- You will see a toast **after transaction is sent** (with link to BscScan)
- Toasts appear **above** Privy modals
- This demo uses Privy's `useSendTransaction()` with success callbacks

## 🧪 BNB Testnet Faucet

Get testnet BNB from:  
👉 [https://bnb-faucet.netlify.app/](https://bnb-faucet.netlify.app/)

## 📁 .env.example

Use this template to set up your local `.env.local` file:

```env
NEXT_PUBLIC_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
PRIVY_APP_SECRET=YOUR_PRIVY_APP_SECRET
PINGPONG_ADDRESS=0x52943bFb088221cd6E3181fbc19081A6B34be948
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NEXT_PUBLIC_PINGPONG_CONTRACT_ADDRESS=0x52943bFb088221cd6E3181fbc19081A6B34be948
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## 📜 License

MIT — use freely for demos, hacks, and experimentation.

Made with 💛 on BNB Testnet.
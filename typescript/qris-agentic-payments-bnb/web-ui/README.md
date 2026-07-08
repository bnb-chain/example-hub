# QRIS Agentic Payments — Web UI

Interactive web interface for the QRIS → BUSD agentic payment flow on BNB Chain.

## Quick Start

```bash
cd web-ui
npm install
npm run dev
```

Open http://localhost:3000

## Features

- **Merchant selection** — pick from 4 sample merchants (warung, kopi, mie ayam, electronics)
- **QRIS generation** — auto-generates a valid QRIS string with CRC16-CCITT
- **CRC validation** — verifies QRIS integrity (same algorithm as `src/qris.ts`)
- **Live FX** — fetches real-time IDR↔BUSD rate from CoinGecko
- **Agent pipeline visualization** — 7-step flow: scan → parse → FX → identity → policy → settle → receipt
- **Wallet Connect** — MetaMask integration via ethers.js v6
- **On-chain settlement** — approves BUSD + calls `QrisPaymentVault.settle()`
- **BscScan links** — settled transactions link directly to explorer

## Architecture

The UI is a standalone Vite + React + Tailwind app. It talks directly to the BNB Chain via ethers.js — no backend server needed. The QRIS parsing logic is bundled in the browser (mirrors `src/qris.ts`).

## Contract

Before settling, deploy `QrisPaymentVault.sol` and enter the contract address in the UI:

```bash
npx hardhat run scripts/deploy-vault.ts --network bsctestnet
```

Enter the deployed vault address in the UI's "Contract Config" panel.

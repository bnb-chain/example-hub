# Quick Test Swap Example

A minimal end-to-end example that demonstrates a token swap on BNB Chain Testnet using the PancakeSwap V2 Router.

This project shows both:
A local AMM simulation (constant-product x * y = k math).
A real on-chain swap on BNB Smart Chain Testnet (tBNB → CAKE).

# Features
Local AMM (automated market maker) math demo.
Quoting expected swap output with slippage check.
Executing a real swap on BSC Testnet.
Written in TypeScript, with clean formatting via Prettier.

# Getting Started

1. Clone & install dependencies
git clone https://github.com/<your-username>/quick-swap.git
cd quick-swap/typescript/quick-test-swap
npm install

2. Set up environment variables
Create a .env file in this folder:
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=<paste-your-actual-testnet-private-key-here>
⚠️ Never commit real keys. Use only Testnet accounts.

# Running Examples
Local AMM Simulation
Runs a simple math-only swap with no chain connection:
npx ts-node index.ts --chain local --amount 1 --slippage 0.5

Testnet Quote (Dry Run)
Fetches expected output on PancakeSwap V2 Router (BSC Testnet):
npm run quote:testnet

Testnet Swap (Send Transaction)
Executes a real swap (tBNB → CAKE) on testnet:
npm run swap:testnet -- --execute true

📖 Example Output
Local simulation

➡️  Local AMM simulation (no on-chain tx)
In:  1 tBNB
Out: 298.95 CAKE
Impact: 0.19%
✅ Local simulation complete.

Testnet swap
➡️  Testnet mode (PancakeSwap V2 Router on BSC Testnet)
Amount In: 0.01 tBNB
Quoted Out: 13.3103970 CAKE
Slippage: 0.5%
amountOutMin: 13.2483450 CAKE
⏳ Sending swap...
Tx submitted: 0x<transaction-hash>
✅ Mined in block 65714391

# Project Scripts
Available scripts in package.json:
npm run dev → run local AMM demo.
npm run quote:testnet → get a swap quote (dry run).
npm run swap:testnet -- --execute true → execute a real swap.

# Notes
Uses Prettier for consistent formatting.
Requires Node.js ≥ 18 and npm ≥ 9.
Meant for learning/demo purposes only.
Runs only on BSC Testnet with test tokens (tBNB, CAKE).

# License
MIT – free to use and modify for educational purposes.
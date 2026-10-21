# AgentOne: The Self-Sovereign AI Employee

**AgentOne** is a decentralized platform on BNB Chain that allows users to hire autonomous AI agents as on-chain legal entities. These agents are secured by MPC (Multi-Party Computation) and can perform complex DeFi tasks like volatility rebalancing.

## 🏗 Architecture

The system consists of three main components:

1.  **Smart Contracts (`contracts/`)**: Built with Foundry.
    *   `AgentFactory`: Deploys new AgentOne instances.
    *   `AgentOne`: The wallet/entity acting as the agent. Holds funds and executes logic.
    *   `AgentEquity`: ERC20 token representing ownership/equity in an agent.
2.  **AI Worker (`scripts/ai_worker.ts`)**: A Node.js bot that acts as the "brain".
    *   Monitors market conditions (e.g., BNB volatility).
    *   Signs transactions via a simulated MPC key.
    *   Triggers the `executeRebalance` function on the contract.
3.  **Frontend (`frontend/`)**: A Next.js dashboard.
    *   Allows users to "hire" (deploy) agents.
    *   Visualizes agent performance and equity.

## 🚀 Quick Start

### Prerequisites
*   [Foundry](https://getfoundry.sh/)
*   [Node.js](https://nodejs.org/) & [Yarn](https://yarnpkg.com/)

### 1. Configuration
Copy `.env.example` to `.env` in the root directory and fill in your keys:
```bash
cp .env.example .env
```
Key variables:
*   `PRIVATE_KEY`: Your wallet private key for deployment.
*   `AI_PRIVATE_KEY`: The private key for the AI Worker (MPC signer).
*   `MPC_SIGNER`: The public address of the AI Worker.

### 2. Smart Contracts
Building and testing the contracts:
```bash
cd contracts
forge build
forge test
```

**Deployment (BSC Testnet):**
```bash
forge script script/Deploy.s.sol --rpc-url <YOUR_RPC_URL> --broadcast
```
*Make sure to note down the `AgentFactory` address from the output.*

### 3. AI Worker
The worker monitors the market and executes transactions.
```bash
cd scripts
yarn install
# Update .env with the deployed Agent Address if specific monitoring is needed
ts-node ai_worker.ts
```

### 4. Frontend
Run the local development server:
```bash
cd frontend
yarn install
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📜 Usage Guide

1.  **Hire an Agent**: Use the frontend to deploy a new AgentOne.
2.  **Invest**: Send BNB to the agent to receive Equity tokens.
3.  **Watch it Work**: The `ai_worker.ts` script (when running) will detect volatility and trigger rebalancing transactions on your agent.
4.  **Dividends**: (Future Feature) The agent can distribute profits back to equity holders.

## 🔗 Contract Addresses (BSC Testnet)
*   **AgentFactory**: `[DEPLOY_TO_GET_ADDRESS]`
*   **Demo Agent**: `[DEPLOY_TO_GET_ADDRESS]`

## 🛡 Security
*   **MPC Protection**: Only the authorized `MPC_SIGNER` can execute sensitive agent logic.
*   **Ownerless**: The agent is largely autonomous, though the Factory tracks deployments.

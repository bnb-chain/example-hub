# Gasless Token Project

This project implements an ERC-2771 compliant Gasless Token system on the BNB Chain (or any EVM chain). It allows users to transfer tokens without paying gas fees, by signing messages that are relayed by a backend service.

## Project Structure

The repository is organized into three main components:

### 1. `contracts/`
Contains the Solidity smart contracts, tests, and deployment scripts using [Foundry](https://getfoundry.sh).

- **`GaslessToken.sol`**: An ERC20 token that inherits from `ERC2771Context`, allowing it to unwrap meta-transactions forwarding the real sender.
  - **Access Control**: Uses `Ownable` to restrict minting (if applicable) to the owner.
  - **Hardening**: Locked Solidity pragma to `0.8.20`.
- **`Forwarder.sol`**: A trusted forwarder contract that verifies EIP-712 signatures and forwards the call to the target contract.

### 2. `relayer/`
A Node.js/Express service that acts as the Relayer.

- Recieves signed meta-transactions from users.
- Verifies the signature off-chain.
- Submits the transaction to the blockchain via the `Forwarder` contract, paying the gas fee.

### 3. `frontend/`
A Next.js 14 application providing the user interface.

- **Stack**: Next.js, TailwindCSS, RainbowKit (v2), Wagmi (v2), Viem.
- **Features**: Wallet connection, reading token balance, and a "Gasless Transfer" form that signs EIP-712 messages instead of sending transactions directly.

## Prerequisites

- **Node.js**: v18+
- **Foundry**: Installed via `foundryup`.
- **Git**

## Setup & Installation

### 1. Smart Contracts

Compile and test the contracts:

```bash
cd contracts
forge build
forge test
```

To deploy (e.g., to a local Anvil node):

1. Start Anvil: `anvil`
2. Deploy:
   ```bash
   forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --private-key <PRIVATE_KEY> --broadcast
   ```
   *Note outputs: deployed addresses for `GaslessToken` and `Forwarder`.*

### 2. Relayer Service

Navigate to `relayer/`:

```bash
cd relayer
npm install
```

Configure Environment Variables:
Copy `.env.example` to `.env` and fill in the details:

```env
RELAYER_PRIVATE_KEY=<Private Key with BNB/ETH to pay for gas>
RPC_URL=http://127.0.0.1:8545
FORWARDER_ADDRESS=<Deployed Forwarder Address>
PORT=3001
```

Start the Relayer:

```bash
npm run dev
```

### 3. Frontend

Navigate to `frontend/`:

```bash
cd frontend
npm install
```

Configure Environment Variables:
Copy `.env.example` to `.env.local` and fill in the details:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<Your Project ID>
NEXT_PUBLIC_GASLESS_TOKEN_ADDRESS=<Deployed Token Address>
NEXT_PUBLIC_FORWARDER_ADDRESS=<Deployed Forwarder Address>
NEXT_PUBLIC_RELAYER_URL=http://localhost:3001/relay
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

Start the App:

```bash
npm run dev
```

## Features & Usage

### Gasless Transfer Flow
1. **User** enters recipient address and amount in the Frontend.
2. **User** clicks "Sign & Send".
3. **Frontend** prompts wallet to sign an EIP-712 typed data message (NOT a transaction). Service never asks for private key.
4. **Frontend** sends the signature and request data to the **Relayer** API.
5. **Relayer** validates consistency and calls `Forwarder.execute()` on-chain.
6. **Forwarder** verifies signature on-chain and calls `GaslessToken.transfer()`.
7. **GaslessToken** sees the original user as `_msgSender()` and processes the transfer.

## Deployment

### Mainnet / Testnet
1. Update `.env` files with real RPC URLs (e.g. BSC Testnet).
2. Use a funded account for the Relayer on the target chain.
3. Deploy contracts to the target chain and update addresses in `.env` files.

# BNB Chain Telegram Token Faucet Demo

## Introduction

This project is a hands-on, full-stack demonstration of how users can **deploy their own BEP20 tokens**, interact with them via a **Telegram bot**, and access basic token utilities like **faucets** and **balance checks**. Built using **Golang** and deployed on **BNB Chain Testnet**, this example bridges smart contracts, blockchain interaction, and Telegram bot integration.

Whether you're a developer exploring smart contract automation, a builder prototyping token tools, or just curious about how to hook blockchain into a Telegram experience — this project is for you.

---

## What You Will Be Building

By the end of this project, you'll have:

- A **Solidity factory contract** deployed on BNB Chain testnet.
- A **Telegram bot** written in Go that can:
  - Deploy a custom BEP20 token for each user
  - Provide a **faucet** for the user’s own token
  - Allow balance queries for any wallet address
- A running backend that uses `go-ethereum` to interact with smart contracts in real-time.

---

## Key Learning Points

- How to create and interact with a **factory smart contract** for BEP20 token deployment
- How to use **Golang** to:
  - Send transactions
  - Call contract methods
  - Parse event logs
- How to integrate a **Telegram bot** for blockchain interaction
- How to manage user token data and provide tailored faucet services

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Go 1.20+
- Git
- Telegram account (to create and use the bot)
- BNB Chain testnet wallet (with test BNB)

---

### 1. Clone the Repository

```bash
git clone https://github.com/bnb-chain/example-hub.git
cd example-hub/go/bnb-faucet-demo
```

---

### 2. Create a `.env` File

Create a `.env` file in the root of `bnb-faucet-demo`:

```env
PRIVATE_KEY=your_faucet_wallet_private_key_without_0x
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CHAIN_ID=97
TOKEN_FACTORY_ADDRESS=0xYourDeployedFactoryContract
TG_BOT_TOKEN=your_telegram_bot_api_token
PORT=8080
```

> Make sure your wallet has testnet BNB and the factory contract is deployed to the testnet.

---

### 3. Install Dependencies

```bash
go mod tidy
```

---

### 4. Run the Project

```bash
go run main.go
```

This will start the Telegram bot and the backend faucet logic.

---

## How to Use the Telegram Bot

After running the project, talk to your Telegram bot (the one associated with `TG_BOT_TOKEN`) and use these commands:

### `/deploy <TokenName> <Symbol>`

Example:
```bash
/deploy MemeToken MEME
```

- Deploys a new BEP20 token for **you** via the factory contract
- The bot will mint the tokens to the faucet wallet

---

### `/faucet <address>`

Example:
```bash
/faucet 0xAbC123...456
```

- Sends 10 tokens of **your token** to the given address

---

### `/balance <address>`

Example:
```bash
/balance 0xAbC123...456
```

- Checks the BEP20 balance of the given address **for your token**

---

## Example Flow

1. User sends `/deploy TestCoin TST`
2. Bot responds with deployed token address
3. User sends `/faucet 0x123...abc`
4. Bot sends 10 TST to that address
5. User sends `/balance 0x123...abc`
6. Bot responds with the token balance for that wallet

---

## Project Structure

```
go/bnb-faucet-demo/
├── main.go              # Entry point
├── bot.go               # Telegram bot logic
├── faucet.go            # Token sending logic
├── balance.go           # Balance query logic
├── utils/
│   └── env.go           # Loads environment variables
├── .env                 # Your config (not committed)
├── go.mod
└── README.md
```

---

## License

MIT License

---

## Contributions

Pull requests, ideas, and issues are welcome! This is a learning-focused example — feel free to extend it or build your own launchpad product from it.


# 🧪 BNB Chain Telegram Token Launch & Faucet Demo

## Introduction

This project is a complete hands-on demo for creating and interacting with your own BEP20 token on **BNB Chain Testnet**, using a **Telegram bot interface** and a backend written in **Go**.

It showcases how to:
- Deploy BEP20 tokens via a **Solidity Factory contract**
- Interact with contracts using **Golang and go-ethereum**
- Let users manage tokens via a **Telegram Bot**

---

## 🔧 What You Will Be Building

- A **Solidity factory contract** that deploys ERC20-compatible tokens
- A **Telegram bot** that lets each user:
  - Deploy their own token
  - Use a faucet to send that token
  - Check token balances
- A **Golang backend** that listens to the Telegram bot and interacts with contracts in real time

---

## 🚀 Getting Started

### ✅ 1. Create Your Wallet (Trust Wallet or MetaMask)

Create a new wallet and switch to **BNB Chain Testnet**.  
Then grab some test BNB from the official [BNB Faucet](https://testnet.bnbchain.org/faucet-smart).

---

### ✅ 2. Create a Telegram Bot

Use [@BotFather](https://t.me/BotFather) to create a new Telegram bot.

- Run `/newbot` and follow the instructions
- Save the API token it gives you — you'll need it for `.env`

---

### ✅ 3. Deploy the Factory Contract

You can:
- Use our deployed example on testnet:  
  `0xeCb781015873dc48a4c0BCdf3ba74dF9269061C3`

**OR**

- Deploy `Factory.sol` using **Hardhat**, **Foundry**, or **Remix**

---

### ✅ 4. Clone the Repository

```bash
git clone https://github.com/your-org/example-hub.git
cd example-hub/go/tg-token-launch-example
```

---

### ✅ 5. Configure Environment Variables

Create a `.env` file:

```env
MNEMONIC=your_mnemonic_phrase_without_quotes
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
TOKEN_FACTORY_ADDRESS=0xeCb781015873dc48a4c0BCdf3ba74dF9269061C3
TG_BOT_TOKEN=your_telegram_bot_api_token
```

---

### ✅ 6. Install Go Dependencies

Make sure you're using **Go 1.20+**:

```bash
go mod tidy
```

---

### ✅ 7. Run the Bot

```bash
go run .
```

If everything is set up, you'll see logs showing that the Telegram bot is running.

---

## 🤖 Telegram Bot Commands

After starting your bot, go chat with it on Telegram.

### `/deploy <Name> <Symbol>`

Deploys a new BEP20 token for your user.

```bash
/deploy TestCoin TST
```

---

### `/faucet <address>`

Sends 10 tokens of the user’s token to the given wallet address.

```bash
/faucet 0xYourFriendWallet
```

---

### `/balance <address>`

Checks the token balance for the given wallet address.

```bash
/balance 0xYourWallet
```

---

## ✅ Example User Flow

1. User sends `/deploy Meme MEME`
2. Bot responds: `✅ Token deployed: 0x...`
3. User sends `/faucet 0xabc...`
4. Bot sends 10 MEME tokens
5. User sends `/balance 0xabc...`
6. Bot replies with token balance

---

## 🗂 Project Structure

```
tg-token-launch-example/
├── Factory.sol          # Solidity factory contract
├── main.go              # Entry point
├── bot.go               # Telegram bot logic
├── faucet.go            # Send tokens
├── balance.go           # Check balances
├── factory.go           # Deploy tokens via contract
├── utils/
│   └── env.go           # Loads .env + key derivation
├── go.mod / go.sum      # Go module dependencies
├── .env                 # Your local config (not committed)
└── README.md
```

---

## 🧠 Learning Points

- Deriving Ethereum wallets from mnemonic phrases (BIP-44)
- Sending transactions and reading logs using go-ethereum
- Interacting with deployed smart contracts
- Parsing custom events in Go
- Building bots with Telegram Bot API

---

## 🪪 License

MIT — use this as a base to build your own launchpad, faucet, or dev tool.

---

## 🙌 Contributing

PRs and ideas are welcome! This is built for developers looking to quickly bootstrap real-world BNBChain projects.

---

### 🌐 Built with 💛 by the BNB Chain Dev Community

# Chainsub – Minimal Smart Contract Event Listener (CLI & Go Package)

## 📌 What is Chainsub?

Chainsub is a lightweight and easy-to-use CLI and Go library designed to subscribe and monitor smart contract events on any EVM-compatible blockchain such as BNB Chain, Ethereum, Polygon, Avalanche, and more.

## 🔍 Why Chainsub?

- **Simplicity**: Minimal setup, no heavy dependencies.
- **Flexibility**: Easily integrates into existing Go projects.
- **Real-time monitoring**: Provides both WebSocket and polling options for event subscriptions.
- **Developer-friendly**: Human-readable logs and JSON outputs for seamless integration and debugging.

## 🛠️ What Chainsub Does

Chainsub:

- Connects to any RPC URL.
- Dynamically fetches contract ABIs (optional).
- Subscribes to specific contract events.
- Decodes event logs into human-readable formats.
- Outputs data to stdout or JSON, with extensibility for additional outputs (e.g., databases, message queues).

## 🚀 Quick Start

### 1. Install

```bash
go install github.com/bnb-chain/example-hub/go/event-listener/cmd/chainsub@latest
```

### 2. Run (Choose mode: Listen or Poll)

#### 🔄 WebSocket (Listen Mode)

**Advantages:**

- Real-time event streaming.
- Efficient and low latency.

**Disadvantages:**

- Requires stable WebSocket-compatible RPC URL.

```bash
chainsub listen \
  --rpc https://bsc.publicnode.com \
  --contract 0x... \
  --event Transfer \
  --fetch-abi \
  --bscscan-api-key YOUR_API_KEY
```

#### ⏱️ HTTP Polling (Poll Mode)

**Advantages:**

- Compatible with any HTTP RPC endpoint.
- Robust against connection drops.

**Disadvantages:**

- Slight delay based on polling interval.

```bash
chainsub listen \
  --rpc https://bsc.publicnode.com \
  --contract 0x... \
  --event Transfer \
  --fetch-abi \
  --mode poll \
  --poll-interval 10 \
  --bscscan-api-key YOUR_API_KEY
```

## ⚙️ Building from Source

```bash
git clone https://github.com/bnb-chain/example-hub.git
cd example-hub/go/event-listener
go build -o chainsub ./cmd/chainsub
```

## 🚩 CLI Flags

| Flag                | Description                         | Required | Example                            |
| ------------------- | ----------------------------------- | -------- | ---------------------------------- |
| `--rpc`             | RPC URL of the EVM-compatible node  | ✅       | `--rpc https://bsc.publicnode.com` |
| `--contract`        | Contract address to monitor         | ✅       | `--contract 0xABC123...`           |
| `--abi`             | Path to ABI JSON file               | ❌       | `--abi ./erc20.json`               |
| `--event`           | Name of event to monitor            | ❌       | `--event Transfer`                 |
| `--from-block`      | Starting block (default: latest)    | ❌       | `--from-block 123456`              |
| `--output`          | Output format (`stdout`, `json`)    | ❌       | `--output json`                    |
| `--mode`            | Listening mode (`ws`, `poll`)       | ❌       | `--mode poll`                      |
| `--poll-interval`   | Interval between polls (in seconds) | ❌       | `--poll-interval 5`                |
| `--poll-window`     | Number of blocks per poll           | ❌       | `--poll-window 2`                  |
| `--fetch-abi`       | Auto-fetch ABI from BscScan         | ❌       | `--fetch-abi`                      |
| `--bscscan-api-key` | BscScan API key                     | ❌       | `--bscscan-api-key yourkey`        |

## 🎯 Use Cases

- Monitor token transfers or specific contract events.
- Debug and validate smart contract behavior.
- Stream on-chain events to external services.
- Build automated bots or monitoring tools.

## 📖 Example Tutorial: Monitoring Token Transfers

Suppose you want to monitor transfer events for a popular token (e.g., Cake on BNB Chain):

1. Run Chainsub to subscribe to `Transfer` events on polling:

```bash
chainsub listen \
  --rpc https://bsc.publicnode.com \
  --contract 0x0eD7e52944161450477ee417DE9Cd3a859b14fD0 \
  --from-block latest \
  --output stdout \
  --mode poll \
  --poll-interval 5 \
  --poll-window 1 \
  --fetch-abi \
  --bscscan-api-key YOUR_API_KEY
```

2. Chainsub provides real-time, formatted logs:

```
📥 Log at block 51273361: 0x9bae08c...
🔁 Transfer Event
----------------------------------------
From:   0xBa53dA030...
To:     0xBeef12345...
Amount: 328.354457 CAKE
```

3. You can adapt this to your own contracts by specifying the contract address and event name.

## 📦 Using as a Go Package

Embed Chainsub directly in your Go projects:

```go
import "github.com/bnb-chain/example-hub/go/event-listener/pkg/listener"

cfg := listener.Config{
  RPCURL:          "https://bsc.publicnode.com",
  ContractAddress: "0x...",
  EventName:       "Transfer",
  FromBlock:       "latest",
  FetchABI:        true,
  APIKey:          "YOUR_API_KEY",
}

if err := listener.Listen(cfg); err != nil {
  log.Fatal(err)
}
```

## 🧩 Extending Chainsub

Extend Chainsub to:

- Write events to databases like PostgreSQL, MongoDB.
- Integrate with message queues like Kafka or RabbitMQ.
- Implement custom event processing logic.

## 📜 License

MIT

## ✍️ Author: Haris Shariff

Built by Haris Shariff — [Github](https://github.com/HarisShariff).
This codebase was originally developed in [github.com/HarisShariff/chainsub](https://github.com/HarisShariff/chainsub) and adapted for the BNB Chain Example Hub.
Feel free to reach out or fork this repo!

## 🌟 Contribute

Feel free to fork, suggest improvements, or contribute via pull requests!

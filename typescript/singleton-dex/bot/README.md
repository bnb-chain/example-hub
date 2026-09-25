# BNBSwap Order Execution Bot 🤖

Automated bot that monitors and executes limit orders on BNBSwap, earning 0.1% execution fees.

## Features

- 🔍 **Real-time Monitoring**: Listens for new order events
- 📊 **Price Checking**: Validates orders against current AMM prices
- ⚡ **Automatic Execution**: Executes profitable orders instantly
- 💰 **Fee Collection**: Earns 0.1% of output on every execution

## Installation

```bash
cd bot
npm install
```

## Configuration

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://bsc-dataseed.binance.org/
SINGLETON_SWAP_ADDRESS=0x...
POLL_INTERVAL=10
```

## Usage

```bash
npm start
```

## How It Works

1. **Monitoring**: Bot listens for `OrderPlaced` events and polls existing orders
2. **Validation**: For each order, bot checks if current AMM price can fill the order
3. **Execution**: If profitable, bot calls `executeOrder(orderId)`
4. **Profit**: Bot receives 0.1% of the output tokens as reward

## Example Output

```
🤖 Order Execution Bot Starting...
📍 Contract: 0x1234...
👛 Executor: 0xabcd...
⏱️  Poll Interval: 10s

📝 New Order Detected: #42
   Owner: 0x5678...
   1000 USDT → 1 BTC
   💰 Potential profit: 0.01 BTC
   
🎯 Executing Order #42...
   📤 TX sent: 0xdef...
   ✅ Order #42 executed successfully!
   💵 Earned: 0.01 BTC
```

## Gas Optimization

The bot uses flash accounting internally, so multi-hop routes are gas-efficient.

## Safety

- Bot will skip orders that can't be profitably executed
- Automatically handles failed transactions
- Graceful shutdown on CTRL+C

## License

MIT

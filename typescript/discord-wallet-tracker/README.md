# Discord Wallet Tracker Bot

A simple bot that listens to BNB Chain wallet transactions and posts real-time notifications to a Discord channel.

## Language

TypeScript / Node.js

## Use Cases

- Track BNB and token transactions of specific wallets
- Alert community via Discord when whales move funds

## How to Run

Follow these steps to install and run the Discord Wallet Tracker Bot locally.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/example-hub.git
cd example-hub/examples/typescript/discord-wallet-tracker
```

> 💡 If you're installing this as a standalone project, just clone the folder or copy it into your workspace.

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Prepare environment variables

Copy the sample `.env.example` file and fill in your own credentials:

```bash
cp .env.example .env
```

Then open `.env` and add your own secrets:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
BSCSCAN_API_KEY=your_bscscan_api_key
WATCHED_ADDRESS=0xYourTargetWalletAddress
```

> ✅ Make sure your Discord bot has permissions to **read and send messages** in the target channel.  
> ✅ You can get a free BscScan API key at [https://bscscan.com/myapikey](https://bscscan.com/myapikey)

---

### 4. Compile the TypeScript project (optional if using `.ts` directly)

```bash
npx tsc
```

> This will generate the compiled JavaScript files in the `dist/` folder.

---

### 5. Run the bot

If you're running with `ts-node` (preferred for dev):

```bash
npx ts-node index.ts
```

Or if you already compiled to JavaScript:

```bash
node dist/index.js
```

Once running, the bot will:

- Check for new transactions on the specified wallet every 10 seconds
- Detect whether it's incoming or outgoing
- Format and send a message to the Discord channel

---

### Example Output in Discord:

```
📥 Incoming transaction detected!
From: 0xabc123...
To: 0xyourwallet...
Amount: 2.1 BNB
Time: 6/23/2025, 10:21 AM
🔎 View on BscScan
```

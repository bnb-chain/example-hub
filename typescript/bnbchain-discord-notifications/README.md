# 🔁 Moralis → Discord PingPong Stream

This Firebase Functions project listens for `Pinged` and `Ponged` events from a smart contract via Moralis Streams, decodes logs using the ABI, and forwards only confirmed events to a Discord Webhook.

### 🛠️ Deployment Instructions

- Navigate to the `smart-contract` folder.  
- Deploy the `PingPong` contract using **Remix** or **Foundry** to your target network.

## 🚀 On-chain Deployment

The PingPong smart contract is deployed at:

👉 [0x52943bFb088221cd6E3181fbc19081A6B34be948](https://testnet.bscscan.com/address/0x52943bfb088221cd6e3181fbc19081a6b34be948#code)


## 🔔 Notifications

You can view real-time Ping/Pong event notifications in the Discord channel **#onchain-ping-pong-notifications**:

👉👉👉 https://discord.gg/xVzRZ9xjYm

### Example Notifications

> **PingPongNotifier • APP — 7:36 PM**  
> 🏓 **Ping event received!**  
> 👤 Sender: `0xc02024B4d446E91253Da8549805553Ac34F9D572`  
> 🔢 Ping #: 2  
> 🕒 Time: *July 11, 2025 at 7:35 PM*

> **PingPongNotifier • APP — 7:48 PM**  
> 🏓 **Pong event received!**  
> 👤 Sender: `0xc02024B4d446E91253Da8549805553Ac34F9D572`  
> 🔢 Pong #: 2  
> 🕒 Time: *July 11, 2025 at 7:47 PM*



## ✅ Features

- **Two HTTPS Functions:**
  - `/pingedStream` for `Pinged` events  
  - `/pongedStream` for `Ponged` events
- Processes only `confirmed: true` events
- Decodes logs with Moralis SDK and ABI
- Forwards formatted messages to Discord Webhook
- Supports `.env` for local development and `firebase functions:config` for production

## 📁 Project Structure

```
functions/
├── src/
│   └── index.ts         # Function logic
├── .env                 # Local development secrets
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Setup & Deployment

### 1. Install dependencies

```bash
cd functions
npm install
```

### 2. Configure Discord Webhook URL

#### Local development via `.env`

1. Create `functions/.env` with:
   ```env
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/XXX/YYY"
   ```
2. In `src/index.ts`, at the top add:
   ```ts
   import * as dotenv from "dotenv";
   dotenv.config();

   const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
   if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_WEBHOOK_URL");
   ```

#### Production via Firebase config

1. Run:
   ```bash
   firebase functions:config:set discord.webhook_url="https://discord.com/api/webhooks/XXX/YYY"
   ```
2. In `src/index.ts`, replace loading with:
   ```ts
   import * as functions from "firebase-functions";

   const DISCORD_WEBHOOK_URL = functions.config().discord.webhook_url;
   if (!DISCORD_WEBHOOK_URL) throw new Error("Missing config.discord.webhook_url");
   ```

### 3. Build & Deploy

```bash
npm run build
firebase deploy --only functions
```

### 4. Local testing

```bash
firebase emulators:start
```

Send a POST request with JSON payload including `"confirmed": true` to:

- `http://localhost:5001/<PROJECT_ID>/us-central1/pingedStream`
- `http://localhost:5001/<PROJECT_ID>/us-central1/pongedStream`

## 🔗 Moralis Stream Setup

1. Log in at [Moralis Admin](https://admin.moralis.io/) → **Streams** → **New Stream**  
2. Create two streams:  
👉 USER YOUR CREATED WEBHOOK FIREBASE URLS

   - **Pinged** → Webhook URL: `https://<YOUR_APP>.cloudfunctions.net/pingedStream`  
   - **Ponged** → Webhook URL: `https://<YOUR_APP>.cloudfunctions.net/pongedStream`  
3. In each stream’s **ABI** section, paste the corresponding JSON:

<details>
<summary><strong>Pinged ABI</strong></summary>

```json
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "sender",   "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "pingCount","type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp","type": "uint256" }
    ],
    "name": "Pinged",
    "type": "event"
  }
]
```
</details>

<details>
<summary><strong>Ponged ABI</strong></summary>

```json
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "sender",    "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "pongCount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "Ponged",
    "type": "event"
  }
]
```
</details>

4. Enable **only confirmed transactions will be sent by the webhook**.

## 🧩 Tech Stack

- **Solidity**  
- **Firebase Functions v2** (Node.js 18+)  
- **TypeScript**  
- **Moralis SDK** (`@moralisweb3/core`, `@moralisweb3`)  
- **Axios**  
- **Discord Webhook API**

## 📜 License

MIT
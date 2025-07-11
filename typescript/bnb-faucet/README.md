# 🪙 BNB Testnet Faucet

A modern web faucet for the BNB Smart Chain testnet, built with Next.js (App Router, TypeScript), Supabase, ethers.js, and Tailwind CSS.

🌐 Live Demo
You can try the faucet live here:
👉 https://bnb-faucet.netlify.app/

Built with Next.js, Tailwind CSS, and Supabase.

Deployed on Netlify for fast global delivery.

Sends 0.001 BNB on BNB Testnet (1 claim per address per 24h).

---

## 🚀 Features

- **Request BNB testnet tokens** directly from the web UI
- **Rate-limited**: 0.001 BNB per address every 24 hours
- **Mainnet eligibility check**: Optionally blocks addresses with ≥ X BNB on mainnet
- **Cooldown/anti-spam**: Tracks last claim per address in Supabase
- **Beautiful, responsive UI** with Tailwind CSS
- **TypeScript** codebase for safety and clarity
- **Supabase** for database and claim tracking
- **Environment-configurable**: faucet amount, cooldown, and more
- **Easy to deploy** on Vercel or any Node.js host

---

## 🧑‍💻 Tech Stack

- [Next.js 14+](https://nextjs.org/) (App Router, TypeScript)
- [ethers.js](https://docs.ethers.org/) – blockchain interactions
- [Supabase](https://supabase.com/) – Postgres DB for rate-limiting
- [Tailwind CSS](https://tailwindcss.com/) – modern utility-first styling

---

## ⚙️ Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```env
FAUCET_PK=0x...               # Private key for funded testnet wallet (never mainnet!)
BNB_RPC=https://...           # BNB testnet or opBNB testnet RPC URL
BNB_AMOUNT=0.001              # Amount of BNB to send per request
COOLDOWN_HOURS=24             # Cooldown in hours per address
SUPABASE_URL=https://...      # Supabase project URL
SUPABASE_KEY=...              # Supabase service role key
CHECK_MAINNET_BALANCE=true    # If true, blocks users with enough mainnet BNB
MAINNET_BALANCE_AMOUNT=0.01   # Mainnet balance threshold (in BNB)
MAINNET_RPC=https://bsc-dataseed.binance.org/ # BNB Chain mainnet RPC
```

**Warning:** Always use a testnet wallet for the faucet!

---

## 🏦 Database Setup (Supabase)

Create a table named `faucet_claims`:

```sql
create table faucet_claims (
  id bigint generated always as identity primary key,
  address text unique not null,
  last_claimed timestamptz,
  created_at timestamptz not null default now()
);
```

---

## 🛠️ Running Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your `.env.local` file as above.

3. Start the app:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) to try it out!

---

## 🖥️ API Endpoints

- **POST `/api/faucet`** – Request BNB for an address  
  Request body: `{ "address": "0x..." }`  
  Responses:
    - Success: `{ success: true, txHash, amount }`
    - Cooldown: `{ error: "Cooldown active", timeLeftSeconds, nextClaimAt }`
    - Not eligible: `{ error: "Address has enough mainnet BNB", ... }`
    - Error: `{ error, details }`

- **GET `/api/faucet-config`** – Returns faucet config (amount, cooldown, etc)

---

## 👨‍🎨 Frontend Features

- Enter wallet address and request testnet BNB
- See success (with BscScan link), error, or cooldown timer
- Mobile-friendly, fast, and simple

---

## 🛡️ Security & Abuse Protection

- Cooldown enforced per address
- Optional mainnet balance check to block hoarders
- Use a testnet-only private key
- Consider adding CAPTCHA or wallet signature in production

---

## 🏁 Deployment

You can deploy to [Vercel](https://vercel.com/) or any Node.js/Vercel-compatible host.

- **Remember:** Set all env variables in your deployment settings!

---

## 🤝 License

MIT – Use, remix, and hack freely!

---

## 🙏 Credits

Built using:
- [Next.js](https://nextjs.org/)
- [ethers.js](https://docs.ethers.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## ✨ Hackathon Ready

Showcase it live, or fork for your own chain/testnet faucet!
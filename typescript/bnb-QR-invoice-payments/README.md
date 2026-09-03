# QR Stablecoin Payments (BNB Chain)

Live demo: [https://bnbchainqrpayments.netlify.app](https://bnbchainqrpayments.netlify.app)  
PaymentProcessor (BNB Chain testnet): `0x369bdf926Eaaf7170Be7E7BD30c7Efa2aA72A3EA`

## Feature showcase
- **Merchant console** – connect wallet, register payout address, mint QR invoices, auto-sync with Supabase, and share short links.
- **Customer pay portal** – scan QR, review invoice details, auto-check settlement status, and approve/pay USDT without editing payloads.
- **Invoice dashboard** – list Supabase invoices, show on-chain settlement via `paymentStatus(invoiceId)`, and display totals.
- **Test payment helper** – merchants can simulate a customer payment (skips approval when allowance exists and blocks re-payment).
- **Supabase + API** – `/api/invoices` manages storage; `/api/invoices/status` reads `paymentStatus` server-side using `BSC_RPC_URL`.
- **Built-in USDT faucet** – header button hits `/api/faucet` to mint 10 mock USDT per request via the provided private key.

## Architecture
```
contracts/               PaymentProcessor + USDYMock (mock USDT)
frontend/                Next.js app (merchant, pay, dashboard, API routes)
supabase/migrations/     SQL schema for invoices table
```

## Deployment guide

### 1. Deploy PaymentProcessor via Remix (BNB Chain testnet)
1. Visit [Remix](https://remix.ethereum.org/) and import `contracts/src/PaymentProcessor.sol`.
2. Compile with Solidity 0.8.25+.
3. In the “Deploy & Run” tab, select the injected Web3 provider (MetaMask pointing to BNB Testnet).
4. Deploy `PaymentProcessor` passing the stablecoin address (e.g., your `USDYMock` deployment). The live demo uses `0x369bdf926Eaaf7170Be7E7BD30c7Efa2aA72A3EA`.
5. (Optional) Deploy `USDYMock.sol` and mint test balances to customer wallets.

### 2. Provision Supabase
1. Create a new Supabase project.
2. Apply the migration:
   ```bash
   cd supabase
   supabase db push   # or supabase migration up
   ```
   This creates the `public.invoices` table with the schema defined in `supabase/migrations/001_create_invoices.sql` (`invoice_id`, `nonce`, status, timestamps, etc.).
3. Note the project URL and Service Role key (Settings → API).

### 3. Configure environment variables
In `frontend/.env.local` (copy from `.env.example`), set:
```
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0x369bdf926Eaaf7170Be7E7BD30c7Efa2aA72A3EA
NEXT_PUBLIC_STABLECOIN_ADDRESS=<USDYMock or other stablecoin>
NEXT_PUBLIC_BSC_RPC=https://bsc-testnet.drpc.org
BSC_RPC_URL=https://bsc-testnet.drpc.org
SUPABASE_URL=<your Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
USDY_FAUCET_PRIVATE_KEY=<private key that owns/mints USDYMock>
```
- `NEXT_PUBLIC_*` values are exposed to the browser.
- `BSC_RPC_URL` is only consumed by API routes (server-side) when checking settlement.
- `USDY_FAUCET_PRIVATE_KEY` is used by the `/api/faucet` route to mint 10 USDT per request (the hackathon key provided is `0x1578...006a`—store it securely in envs, never hard-code in client bundles).

### 4. Install & run frontend
```bash
cd frontend
npm install
npm run dev   # visit http://localhost:3000
```
Set `npm run build && npm start` (or deploy via Netlify/Vercel) for production; the live site uses Netlify.

### 5. Merchant workflow
1. Navigate to `/merchant`.
2. Connect MetaMask → register payout address (on-chain `registerMerchant`).
3. Fill amount/memo → click “Generate invoice” (saves invoice hash + nonce to Supabase and renders QR + share link).
4. Share the link/QR or click “Invoices” in the header to see Supabase records.

### 6. Customer workflow
1. Open `/pay?payload=...` (from QR link).
2. Connect wallet; the UI verifies the invoice on-chain via `/api/invoices/status`.
3. Click “Approve & Pay” (skips re-approval if allowance is sufficient). Settled invoices cannot be paid twice.

## Repo scripts
```bash
# Contracts
cd contracts
forge test                                 # run Foundry tests

# Frontend
cd frontend
npm run dev                                # dev server
npm run lint                               # lint + typecheck
npm run build && npm start                 # production mode
```

## Supabase schema (for reference)
```sql
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  amount text not null,
  memo text,
  processor text not null,
  token text not null,
  chain_id text not null default '97',
  invoice_id text unique not null,
  nonce text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  tx_hash text,
  payer text
);

create index if not exists invoices_merchant_idx on public.invoices (merchant);
create index if not exists invoices_status_idx on public.invoices (status);
```

> Paste the block above into Supabase's SQL editor if you prefer creating the table manually.

## Notes
- Stablecoin: `USDYMock.sol` acts as a USDT mock with `mint` exposed; ensure customers mint or receive tokens on BNB Testnet.
- Settlement check: both the merchant dashboard and pay portal call `/api/invoices/status`, which uses server-side RPC to read `paymentStatus(invoiceId)` from `PaymentProcessor`.
- Wallet persistence: merchant/pay pages store the last connected account locally and rehydrate on page load.

Feel free to extend with Moralis streams, NFC hooks, or production-grade storage. The current stack is tuned for hackathon demos with rapid QR issuance and Supabase-backed tracking.

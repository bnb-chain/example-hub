# Frontend (Next.js)

A Next.js 14 app-router UI with two distinct surfaces:

- `/merchant` – a console where merchants self-register, configure processor + USDT mock addresses, and mint QR-ready invoices.
- `/pay` – a streamlined payment portal that customers open after scanning the QR/link to review the receipt and settle it.

The landing page (`/`) simply links both flows for demos.

## Development

```bash
cd frontend
cp .env.example .env.local   # set contract addresses, Supabase credentials, and RPC URL
npm install                  # already run for you, repeat if you add deps
npm run dev                  # local dev server on http://localhost:3000
npm run lint                 # typecheck + lint
```

### Key flows

- **Merchant setup (`/merchant`)** – connect MetaMask, register/update payout wallets, and compute invoice hashes via `computeInvoiceId`. The resulting payload is turned into a shareable URL + QR that points to `/pay`.
- **QR generation (`/merchant`)** – print or share the QR/link; optional “Test payment” button lets merchants run through the flow with their own wallet.
- **Payment execution (`/pay`)** – when a user lands here, the JSON payload auto-populates, they connect a wallet, approve USDT spend, and call `pay(...)` on the processor via ethers v6.

The UI automatically prompts wallets to switch to BNB Chain testnet (chainId 97) and exposes helper inputs for processor and stablecoin addresses so you can rapidly swap deployments during the hackathon.

### API routes

Next.js handles backend duties via Supabase-backed route handlers in `src/app/api/invoices`:

- `GET /api/invoices` – list every invoice stored in Supabase.
- `POST /api/invoices` – create a new invoice record (merchant, amount, memo, processor, token, chainId).
- `GET /api/invoices/:id` – fetch a single invoice by ID.
- `POST /api/invoices/:id/settled` – mark an invoice as settled with optional `txHash` + `payer`.
- `GET /api/invoices/status?invoiceId=...&processor=...` – read `paymentStatus(invoiceId)` on-chain via server-side RPC.
- `POST /api/faucet` – server-side mint of 10 mock USDT using `USDY_FAUCET_PRIVATE_KEY`; invoked by the header button.

### Supabase configuration

1. Provision a Supabase project and create a table named `invoices` with the columns described in the root README (`merchant`, `amount`, `memo`, `processor`, `token`, `chain_id`, `invoice_id`, `nonce`, `status`, timestamps, etc.).
2. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and BNB RPC URLs (`NEXT_PUBLIC_BSC_RPC`, `BSC_RPC_URL`) to `.env.local`. The service role key and server RPC are only used inside Next.js route handlers.
3. Adjust Row Level Security policies if necessary (service role bypasses them by default).

The helper in `src/lib/server/invoiceStore.ts` handles inserts/selects/updates; replace or extend it if you introduce additional persistence layers.

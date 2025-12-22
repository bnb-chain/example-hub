# Auto-Mass Payouts (BNB Chain Hackathon)

Auto-Mass Payouts lets ops teams orchestrate high-volume vendor, affiliate, or reward disbursements on the BNB Smart Chain testnet. The system combines a gas-efficient Foundry contract suite with a Supabase-driven Next.js control panel so every batch comes with verifiable blockchain receipts and human-friendly analytics.

## Repository layout

| Path | Description |
| --- | --- |
| `contracts/` | Foundry workspace with the `MassPayout` contract, mock BEP-20 USDT token, Forge tests, and a deployment script for BNB testnet. |
| `frontend/` | Next.js 15 (App Router) dashboard for crafting mass payouts, connecting wallets, and persisting batch metadata to Supabase. |
| `frontend/.env.example` | Template for all environment variables (Next.js, Supabase, Foundry deploy script). |

## Quick start

1. **Install toolchain** – Foundry (`curl -L https://foundry.paradigm.xyz | bash`), Node 20+, npm.
2. **Configure environments** – copy `frontend/.env.example` to `frontend/.env.local`, then fill in contract addresses plus Supabase + scheduler credentials.
3. **Deploy contracts** – use the Foundry script to broadcast `MassPayout` + `MockUSDT` on BNB Smart Chain testnet and mint demo balances.
4. **Create Supabase tables** – `batches` for executed payouts and `scheduled_batches` for queued jobs (schemas below).
5. **Connect your wallet in the UI** – switch between “Execute Now” and “Program Payout” modes, upload CSVs, and let `/api/run-scheduler` fire due jobs automatically.

## Smart contracts

### MassPayout.sol
* Owner-initialized contract capable of streaming both ERC-20/BEP-20 tokens and native BNB to arbitrary address sets.
* Emits `PayoutExecuted`, `ScheduledPayoutCreated`, `ScheduledPayoutExecuted`, and `ScheduledPayoutCancelled` for full off-chain observability.
* Uses OpenZeppelin `Ownable`, `SafeERC20`, and `Address` helpers for safety.
* Provides instant primitives (`sendERC20`, `sendNative`) plus scheduled flows (`scheduleERC20`, `scheduleNative`, `executeScheduled`, and `cancelScheduled`).
* Scheduled batches escrow funds inside the contract, store a hash of recipients/amounts, and can be executed by anyone (UI scheduler, backend cron, etc.) after `executeAfter`.

### Mock tokens
* `MockUSDT` (6 decimals) deploys alongside the protocol and exposes a `faucet(address,uint256)` helper plus a `demoFaucet()` that mints a fixed 1,000 tokens to the caller for effortless funding during demos. Native BNB payouts draw directly from your wallet balance.

### Tests & config
* Forge configuration (`contracts/foundry.toml`) enables `via-ir` for stack-depth friendliness and optimizer runs.
* Comprehensive tests in `contracts/test/MassPayout.t.sol` cover ERC-20 payouts, native payouts, length mismatches, and funding checks.
* Run the suite with:

```bash
cd contracts
forge test
```

### Deployment script

`contracts/script/DeployMassPayout.s.sol` deploys MassPayout plus the mock USDT token in a single broadcast. It reads `MASS_PAYOUT_OWNER` from the environment and prints all addresses.

Example:

```bash
export RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545"
export PRIVATE_KEY="0xabc..."          # funded testnet key
export MASS_PAYOUT_OWNER="0xTeamMultiSig"

cd contracts
forge script script/DeployMassPayout.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

After deployment, copy the printed addresses into `.env` / `frontend/.env.local` so the UI knows which contracts to call.

### Minting test liquidity

Call the faucet helpers to mint tokens to any wallet:

```bash
cast send <MOCK_USDT_ADDRESS> "faucet(address,uint256)" <recipient> 100000000000 --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

(Adjust decimals: USDT uses 6.)

## Frontend (Next.js)

Product UX highlights inside `frontend/`:

* **Two-click flow selection** – toggle between “Execute now” and “Program payout” modes. Scheduled flows expose a native `datetime-local` picker and show when the batch will fire.
* **CSV-first input** – paste rows, or tap “Load CSV” to import any file that follows `address,amount`. A themed helper card links to `public/sample-recipients.csv` so vendors know exactly what to send.
* **BNB-branded hero + clarity copy** – yellow/black palette, chip badges for chain + contract, inline status feed, and BscScan links with truncated hashes.
* **History + runway** – executed batches (with Supabase fallback messaging) sit next to the programmed queue so ops can see what’s live, pending, or already executed.
* **Automation guidance** – the UI explains how the `/api/run-scheduler` endpoint and `SCHEDULER_*` env vars keep scheduled payouts self-driving, plus a cheat sheet for CSV expectations.

### Supabase schema

Create a table that matches the payload inserted by `/api/batches`:

```sql
create table public.batches (
  id bigserial primary key,
  batch_id text unique not null,
  metadata_uri text,
  token text,
  token_type text,
  total_wei numeric,
  human_total text,
  recipient_count integer,
  tx_hash text,
  payer text,
  chain_id integer,
  recipients jsonb,
  created_at timestamptz not null default now()
);
```

*Enable Row Level Security* if desired and grant the service-role key `insert` privileges. The client never sees this key—the Next.js API route owns it.

Schedule metadata lives in a sibling table and drives the automation worker:

```sql
create table public.scheduled_batches (
  id bigserial primary key,
  schedule_id text unique not null,
  metadata_uri text,
  token text,
  token_type text,
  total_wei numeric,
  human_total text,
  execute_after timestamptz,
  payer text,
  chain_id integer,
  recipients jsonb,
  executed boolean not null default false,
  executed_tx text,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);
```

## Automation worker

* **Endpoint:** `POST /api/run-scheduler` (lives in the Next.js app) checks Supabase for due entries, executes up to five schedules per run, and writes back `executed`, `executed_tx`, and `executed_at`.
* **Environment:** set `SCHEDULER_PRIVATE_KEY`, `SCHEDULER_RPC_URL`, and optionally `SCHEDULER_WEBHOOK_TOKEN` so only your cron job can trigger the route. The UI’s automation checklist mirrors these variables.
* **Cron ideas:** Vercel Cron, GitHub Actions, PM2, or any server that periodically calls the endpoint with the `x-cron-token` header when a secret is configured.

### Supabase (Postgres) cron example

Supabase ships with the `pg_cron` + `pg_net` extensions, so you can schedule the HTTP call straight from the database:

```sql
-- one-time setup if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- run every 5 minutes
select cron.schedule(
  'masspayout_scheduler',
  '*/5 * * * *',
  $$
    select
      net.http_post(
        url := 'https://your-app.vercel.app/api/run-scheduler',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-token', 'YOUR_SCHEDULER_WEBHOOK_TOKEN'
        ),
        body := '{}'
      );
  $$
);
```

The call uses the same `x-cron-token` the API route expects. Adjust the cadence and URL to match your deployment; Supabase will handle retries and logging in the `cron.job_run_details` table.

## CSV template

The UI expects a minimal structure:

```
address,amount
0xA41f2c2340928afDf4b3F44E8fE1B3Df2938F5d4,125.50
0xB19f7634ED5489A3619AF9b388dF1234F15c1234,200
0xCD26a93F6782f006cc76E9187A9bE1F4cCcc4321,42.75
```

Upload any CSV/TSV following this pattern or share `frontend/public/sample-recipients.csv` with your ops team. The UI highlights parsing errors inline and lets you continue editing rows manually.

## Testing & quality gates

| Command | Purpose |
| --- | --- |
| `cd contracts && forge test` | Runs Solidity unit tests. |
| `cd frontend && npm run lint` | ESLint / TypeScript checks for the UI. |

### Forge test suite

Latest `forge test` run (contracts) – 21 passing cases:

- `test_SendERC20MassPayout`
- `test_SendNativeMassPayout`
- `test_DemoFaucetMintsThousandTokens`
- `test_SendERC20RevertsOnZeroRecipient`
- `test_SendNativeRevertsOnZeroAmount`
- `test_RevertWhenLengthMismatch`
- `test_RevertWhenInsufficientNativeValue`
- `test_EstimateTotalSumsArray`
- `test_ScheduleAndExecuteERC20`
- `test_ScheduleAndExecuteNative`
- `test_ScheduleERC20RevertsWhenExecuteAfterPast`
- `test_ScheduleNativeRevertsWhenExecuteAfterPast`
- `test_ScheduleNativeRevertsWhenValueMismatch`
- `test_ScheduleERC20RevertsOnDuplicateParameters`
- `test_ExecuteScheduledRevertsWhenMissing`
- `test_ExecuteScheduledRevertsWhenNotReady`
- `test_ExecuteScheduledRevertsWhenRecipientMismatch`
- `test_ExecuteScheduledRevertsWhenAlreadyExecuted`
- `test_CancelScheduleRefunds`
- `test_CancelScheduleRevertsWhenNotCreator`
- `test_CancelScheduleRevertsWhenAlreadyExecuted`

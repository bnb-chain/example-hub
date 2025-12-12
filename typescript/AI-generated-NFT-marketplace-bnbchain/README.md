# MarketplaceNFT Monorepo

A full-stack hackathon showcase: users describe art with AI prompts, mint the generated NFT on BNB Chain testnet, and trade it through a fixed-price marketplace with real-time listings powered by Supabase + Moralis Streams.

## Highlights

- **AI-powered creation** – Replicate (Flux Schnell) turns prompts into artwork, Pinata pins the output, and metadata is ready for minting in a single flow.
- **Self-contained marketplace** – A custom ERC-721 with built-in escrow. Listings are minted or transferred directly into the contract, preventing race conditions.
- **Instant data sync** – Supabase captures launchpad state, while Moralis Streams + Edge Functions persist listings, cancellations, and purchases.
- **Wallet-friendly UX** – Next.js + RainbowKit with BNB testnet RPC, so hackathon judges can connect and mint/list/buy with minimal setup.
- **Supabase-first backend** – SQL migrations, debugging logs, and server helpers live alongside the frontend for fast iteration.

## Repository Layout

- `CONTRACTS/` – Foundry workspace for building/deploying the MarketplaceNFT ERC-721 + marketplace.
- `FRONTENDNFT/` – Next.js 14 app (App Router) enabling AI generation, minting, listing, and marketplace browsing.
- `FRONTENDNFT/supabase/` – SQL migrations + Supabase assets used by API routes and Edge Functions.

## Prerequisites

- Node.js 18+, npm, and Supabase CLI.
- Foundry (`forge`, `cast`, `anvil`) for contract work.
- BNB Chain testnet RPC URL + funded deployer private key.
- WalletConnect project ID (RainbowKit modal).
- Supabase project (database + Edge Functions) and service role key.
- Moralis Streams account.
- Pinata JWT (IPFS uploads) and Replicate API token (AI art).

---

## 1. Deploy the MarketplaceNFT contract

### Option A (recommended): Remix

1. Navigate to https://remix.ethereum.org and import `CONTRACTS/src/MarketplaceNFT.sol` via GitHub or by pasting the file contents.
2. In the Solidity compiler tab select version `0.8.23` and compile `MarketplaceNFT.sol`.
3. Open the Deploy & Run tab:
   - Environment: *Injected Provider - MetaMask* (set MetaMask to BNB Chain Testnet).
   - Contract: `MarketplaceNFT`.
   - Constructor args: name (e.g., `MarketplaceNFT`) and symbol (e.g., `MNFT`).
4. Click **Deploy**, approve the transaction, and wait for confirmation.
5. Copy the deployed address—you need it for the frontend `.env.local`, Supabase functions, and Moralis streams.

### Option B: Foundry CLI

1. Install Foundry if needed:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
2. Build and deploy directly from the CLI:
   ```bash
   cd CONTRACTS
   forge build

   RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545" \
   PRIVATE_KEY="0xabc..." \
   forge create src/MarketplaceNFT.sol:MarketplaceNFT \
     --rpc-url "$RPC_URL" \
     --private-key "$PRIVATE_KEY" \
     --constructor-args "MarketplaceNFT" "MNFT"
   ```
3. Record the contract address for later steps.

The contract exposes `mint`, `list`, `cancelListing`, and `buy` with the events below (topics needed for Moralis):

- `event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)`
- `event ListingCancelled(uint256 indexed tokenId)`
- `event Purchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)`

---

## 2. Configure Supabase (database + tables)

### Apply migrations

Run the SQL in `FRONTENDNFT/supabase/migrations` using either:

- **CLI:** 
  ```bash
  cd FRONTENDNFT
  supabase link --project-ref <PROJECT_REF>
  supabase db push
  ```
- **Manual SQL editor:** open the Supabase dashboard → SQL Editor → paste the scripts below and click *Run* (repeat for each block if you prefer separate transactions).

For reference, the core tables are:

```sql
-- launchpad tables
create table if not exists public.launchpad_generation_selection (
  wallet_address text not null,
  generation_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint launchpad_generation_selection_pkey primary key (wallet_address),
  constraint launchpad_generation_selection_generation_id_fkey
    foreign key (generation_id) references launchpad_generations(id) on delete set null
);

create table if not exists public.launchpad_generations (
  id uuid not null default gen_random_uuid(),
  wallet_address text not null,
  description text not null,
  prompt text not null,
  image_url text not null,
  traits jsonb not null default '[]'::jsonb,
  metadata_uri text null,
  image_ipfs_uri text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint launchpad_generations_pkey primary key (id)
);

create index if not exists launchpad_generations_wallet_created_at_idx
  on public.launchpad_generations using btree (wallet_address, created_at desc);

-- marketplace listings
create type if not exists public.marketplace_listing_status as enum ('LISTED', 'SOLD', 'CANCELLED');

create table if not exists public.marketplace_listings (
  token_id text not null,
  seller text not null,
  price numeric not null,
  token_uri text null,
  metadata jsonb null,
  status public.marketplace_listing_status not null default 'LISTED'::marketplace_listing_status,
  last_updated timestamptz not null default timezone('utc', now()),
  constraint marketplace_listings_pkey primary key (token_id)
);

create index if not exists marketplace_listings_status_idx on public.marketplace_listings(status);
create index if not exists marketplace_listings_seller_idx on public.marketplace_listings(seller);
```

### Edge function logs table

The cancel/purchase handlers rely on a lightweight log store for debugging. Create it via the SQL editor (or add it to your migrations) if it does not already exist:

```sql
create table if not exists public.edge_logs (
  id bigint generated by default as identity primary key,
  function text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
```

---

## 3. Frontend setup & deployment (Next.js)

1. Copy the example environment file:
   ```bash
   cd FRONTENDNFT
   cp .env.example .env.local
   ```
2. Fill in the variables:
   - `NEXT_PUBLIC_MARKETPLACE_ADDRESS` – contract deployed on BNB testnet.
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – enable RainbowKit/WC modal.
   - `NEXT_PUBLIC_MARKETPLACE_DEPLOYMENT_BLOCK` – optional lower bound for past log scans.
   - `NEXT_PUBLIC_BSC_RPC_URL` – optional RPC override for wagmi.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` – required for server actions storing generations and listings.
   - `REPLICATE_API_TOKEN` – generates images.
   - `PINATA_JWT` – uploads generated images and metadata to IPFS.
3. Install and run locally:
   ```bash
   npm install
   npm run dev
   # open http://localhost:3000
   ```
4. Production build:
   ```bash
   npm run build
   npm run start
   ```
   Deploy the `.next` output to your preferred host (Vercel, Netlify, Docker, etc.). Make sure the same environment variables are configured in your hosting provider.

---

## 4. Supabase Edge Functions for Moralis streams

Create three Edge Functions so Moralis can push contract events directly into Supabase. Each function requires:

- `SUPABASE_URL` – project URL (e.g., `https://xyz.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` – service role key with `insert`/`delete` access.
- `BSC_TESTNET_RPC` – RPC endpoint used to fetch metadata via ethers.js.
- `MARKETPLACE_NFT_CONTRACT` – address deployed on testnet.

General workflow via CLI:

```bash
cd FRONTENDNFT
supabase functions new listed
supabase functions new listing_cancelled
supabase functions new purchase_handler
# Replace the generated index.ts with the code below for each function
supabase functions deploy <name> --no-verify-jwt
```

**Manual alternative:** open the Supabase dashboard → *Edge Functions* → *New Function* for each handler, paste the code snippets below into the editor, set the environment variables in the UI, and click *Deploy*. This is handy during demos when CLI access is limited.

#### Listed handler (`supabase/functions/listed/index.ts`)

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RPC = Deno.env.get("BSC_TESTNET_RPC");
const NFT_CONTRACT = Deno.env.get("MARKETPLACE_NFT_CONTRACT");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const minimalABI = ["function tokenURI(uint256 tokenId) view returns (string)"];
const LISTED_TOPIC = "0x50955776c5778c3b7d968d86d8c51fb6b29a7a74c20866b533268e209fc08343";

// ...ipfs helpers + fetchNftMetadata (see snippet provided)...
// ...ethers helpers parseAddress/hexToBigInt/fetchTokenURI...

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body?.logs?.length) return new Response("ok", { status: 200 });

  const log = body.logs.find((l) => l.topic0 === LISTED_TOPIC);
  if (!log) return new Response("No Listed event", { status: 400 });

  const tokenId = BigInt(log.topic1);
  const seller = "0x" + log.topic2.slice(-40);
  const price = BigInt(log.data);

  const tokenUri = await fetchTokenURI(tokenId);
  const metadata = tokenUri ? await fetchNftMetadata(tokenUri) : null;

  await supabase.from("marketplace_listings").upsert(
    {
      token_id: tokenId.toString(),
      seller,
      price: price.toString(),
      token_uri: tokenUri,
      metadata,
      status: "LISTED",
      last_updated: new Date().toISOString(),
    },
    { onConflict: "token_id" },
  );

  return new Response("processed", { status: 200 });
});
```

*(Use the full helper implementations from the code sample shared in the request to normalize metadata and resolve IPFS URLs.)*

#### Cancel handler (`supabase/functions/listing_cancelled/index.ts`)

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const CANCEL_TOPIC =
  "0x6e353d3fd7bf8c51d3f0c86f1f36233fd81bb21c76623d8872ebb3df2b9b1860";

const decodeUint256 = (hex: string) => BigInt(hex).toString();

async function logDebug(tag: string, payload: Record<string, unknown>) {
  await supabase.from("edge_logs").insert({
    function: "listing_cancelled",
    payload: { tag, ...payload },
  });
}

Deno.serve(async (req) => {
  await logDebug("incoming_request", {});

  const body = await req.json().catch(() => null);
  if (!body?.logs?.length) return new Response("ok", { status: 200 });

  const log = body.logs.find((l) => l.topic0 === CANCEL_TOPIC);
  if (!log) return new Response("no cancel", { status: 200 });

  const tokenId = decodeUint256(log.topic1);
  await logDebug("decoded_event", { tokenId });

  const { data: exists } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("token_id", tokenId);

  if (!exists?.length) return new Response("not found", { status: 200 });

  await supabase.from("marketplace_listings").delete().eq("token_id", tokenId);
  await logDebug("delete_result", { tokenId });

  return new Response("ok", { status: 200 });
});
```

#### Purchase handler (`supabase/functions/purchase_handler/index.ts`)

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const PURCHASED_TOPIC =
  "0x3fb02bfbf01f7dc3a4c6903acc6b06ca1d9af7647282593f46cbacefc288b602";

const decodeUint256 = (hex: string) => BigInt(hex).toString();
const decodeAddress = (topic: string) =>
  topic ? (`0x${topic.slice(26)}` as const) : null;

async function logDebug(tag: string, payload: Record<string, unknown>) {
  await supabase.from("edge_logs").insert({
    function: "purchase_handler",
    payload: { tag, ...payload },
  });
}

Deno.serve(async (req) => {
  await logDebug("incoming_request", {});

  const body = await req.json().catch(() => null);
  if (!body?.logs?.length) return new Response("ok", { status: 200 });

  const log = body.logs.find((l) => l.topic0 === PURCHASED_TOPIC);
  if (!log) return new Response("no purchase", { status: 200 });

  const tokenId = decodeUint256(log.topic1);
  const seller = decodeAddress(log.topic2);
  const buyer = decodeAddress(log.topic3);
  const price = decodeUint256(log.data);
  await logDebug("decoded_event", { tokenId, seller, buyer, price });

  const { data: exists } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("token_id", tokenId);

  if (!exists?.length) return new Response("not found", { status: 200 });

  await supabase.from("marketplace_listings").delete().eq("token_id", tokenId);
  await logDebug("delete_result", { tokenId });

  return new Response("ok", { status: 200 });
});
```

After deploying each function, note the HTTPS endpoint (e.g., `https://<project>.functions.supabase.co/listed`)—you will supply these URLs to Moralis as webhook targets.

---

## 5. Moralis Streams creation

Create three separate streams so the marketplace stays synchronized:

1. **Listed stream**
   - Chain: BNB Chain Testnet (chain ID `0x61`).
   - Tag: `marketplace_listed`.
   - Description: "MarketplaceNFT Listed events".
   - Webhook URL: Supabase Listed Edge Function endpoint.
   - ABI: paste the `Listed` event ABI (`{"anonymous":false,"inputs":[...],"name":"Listed","type":"event"}`).
   - `topic0` filter: `0x50955776c5778c3b7d968d86d8c51fb6b29a7a74c20866b533268e209fc08343`.
   - `includeContractLogs`: true, `allAddresses`: false, and add your deployed contract address to the stream.

2. **ListingCancelled stream**
   - Same chain + address settings as above.
   - Topic: `0x6e353d3fd7bf8c51d3f0c86f1f36233fd81bb21c76623d8872ebb3df2b9b1860`.
   - Webhook URL: Supabase `listing_cancelled` Edge Function.

3. **Purchased stream**
   - Topic: `0x3fb02bfbf01f7dc3a4c6903acc6b06ca1d9af7647282593f46cbacefc288b602`.
   - Webhook URL: Supabase `purchase_handler` Edge Function.

For each stream:

- Enable webhook signature verification for security and store the signing secret as a Supabase function env var if you want to validate the signature (optional for the current implementation).
- After creating the stream, use the Moralis UI to send a `Replay` or `Send Test` event to confirm that the Supabase functions respond with `200 OK`. The `edge_logs` table will capture payloads that help debug issues.

---

## 6. Putting it all together

1. Deploy the contract and record the address.
2. Apply Supabase migrations and create the `edge_logs` helper table.
3. Deploy the Supabase Edge Functions with the service role key, RPC URL, and contract address configured.
4. Configure the three Moralis streams targeting the Edge Function URLs.
5. Fill out `.env.local` in `FRONTENDNFT`, start the Next.js app, and walk through AI generation → mint → list → buy.
6. Ship the frontend to Vercel/Netlify (or similar) with the same env vars.

After that, judges can prompt, mint, and flip NFTs in minutes while the Supabase dashboard reflects every listing, cancellation, and sale in real time.

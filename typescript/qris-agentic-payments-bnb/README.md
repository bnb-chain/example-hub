# QRIS Agentic Payments on BNB Chain

A **Web2.5 agentic payments** cookbook aligned with the **BNBAgent SDK** stack
(BAP-692): an autonomous agent that parses a QRIS (Indonesia national QR)
payment code, converts IDR to a BNB Chain native stablecoin (BUSD / FDUSD / $U),
and settles on BNB Chain via direct ERC20 transfer or the x402/MPP
machine-payment protocol (`@bnb-chain/mpp`).

This is the first example in the hub to demonstrate the full Web2.5 agent
economy pattern: **ERC-8004 identity** → **QRIS intent capture** → **FX
conversion** → **spend policy gate** → **on-chain settlement** → **receipt +
reputation**.

## What it does

```
QRIS code → parse + CRC16 validate → IDR→stablecoin FX → identity check →
spend policy gate → settle on BNB Chain (direct | x402/MPP) → receipt recorded →
reputation updated
```

## BNBAgent SDK Stack Alignment

This example implements the four layers from BAP-692:

| Layer | Standard | This Example |
| --- | --- | --- |
| **Identity** | ERC-8004 | `src/identity.ts` — agent registration, reputation, gate |
| **Commerce** | ERC-8183 | Future: escrow job lifecycle (documented seam) |
| **Payment** | MPP + x402 | `src/payment.ts` — direct transfer + `@bnb-chain/mpp` 402 flow |
| **Memory** | BNB Greenfield | `src/receipts.ts` — receipt log (Greenfield seam) |

## Multi-Token Support

The agent settles in whichever curated BNB Chain stablecoin the merchant
prefers — not just BUSD:

| Token | Address | EIP-3009 | Use Case |
| --- | --- | --- | --- |
| **BUSD** | `0xe9e7…C12` | ✅ | Default settlement token |
| **FDUSD** | `0xc5f0…51d` | ✅ | Binance x402 native support |
| **$U** | `0x4e59…8d1a` | ✅ | Gasless (EIP-3009), used by BNBAgent SDK |

All tokens are 18 decimals on BSC. The `TokenRegistry` (`src/tokens.ts`) handles
resolution by symbol or address, with EIP-3009 domain metadata for the
`authorization` credential path.

## Getting Started

### Prerequisites

- **Node.js** v18+ (tested on v22)
- **npm**
- No wallet, RPC, or funds needed for the demo or tests — they run on an
  in-process Hardhat network.
- For real BSC settlement: a funded wallet (`PRIVATE_KEY` in `.env`) and a BSC
  RPC endpoint.

### Installation

1. **Install dependencies**:

   ```bash
   cd typescript/qris-agentic-payments-bnb
   npm install
   ```

2. **Environment setup**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` only if you plan to run against real BSC. The demo and tests need
   no credentials.

   ```env
   # Agent wallet (payer). Leave empty for the in-process Hardhat demo.
   PRIVATE_KEY=

   # BNB Chain RPC (optional; defaults to public endpoints).
   BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.bnbchain.org:8545
   BSC_RPC=https://bsc-dataseed.bnbchain.org

   # Settlement address that receives stablecoin on-chain.
   SETTLEMENT_ADDRESS=

   # Live FX source. Leave empty for static demo rate or set to "coingecko".
   RATE_SOURCE=

   # x402 / MPP protected URL. When set, the agent pays via 402 challenge.
   MPP_PROTECTED_URL=
   ```

### Running the Project

**Demo (zero setup)**:

```bash
npx hardhat run scripts/run-agent.ts
# → builds a dynamic QRIS, parses it, converts 18000 IDR → stablecoin, pays on-chain
# → with RATE_SOURCE=coingecko, fetches the live IDR/stablecoin rate in real time
```

**Test suite** (75 tests, ~12s):

```bash
npx hardhat test
```

Expected output:

```
  QRIS parser (3 tests)
  IDR -> BUSD conversion (1 test)
  QrisPayAgent end-to-end (1 test)
  Multi-token registry (4 tests)
  ERC-8004 agent identity (2 tests)
  Reputation gate (3 tests)
  Spend policy (5 tests)
  Receipt log (2 tests)
  Agent with multi-token + policy + receipts (2 tests)
  x402 / MPP end-to-end (2 tests)
  Security audit fixes (12 tests)
  PoC exploit tests (6 tests)
  Extensions / SDK modules (18 tests)
  QrisPaymentVault contract (10 tests)

  75 passing (12s)
```

## Web UI

An interactive React + Vite + Tailwind frontend that visualises the entire
agent payment pipeline — from QRIS scan to on-chain settlement.

```bash
cd web-ui
npm install
npm run dev    # http://localhost:3000
npm run build  # production build → dist/
```

### Features

- **7-step pipeline visualization**: Scan → Parse → Convert → Identity →
  Policy → Settle → Receipt
- **MetaMask wallet connect** (ethers.js v6 BrowserProvider)
- **Live CoinGecko IDR↔BUSD rate** with static fallback
- **CRC16-CCITT validation** matching `src/qris.ts`
- **Optical-illusion design**: scanner-frame, pulsing rings, tunnel-entrance
  spinner, confetti on success
- **2-color palette**: indigo `#3D348B` + amber `#F0A202` on cream `#FAF7F2`

### Deploy to Vercel

```bash
cd web-ui
vercel --prod
```

The `vercel.json` is pre-configured with SPA rewrites. The build output is in
`dist/`.

### Smart Contract: QrisPaymentVault

A real escrow contract that receives BUSD via `approve()` + `settle()`:

```bash
npx hardhat run scripts/deploy-vault.ts --network bscTestnet
```

The vault credits merchant balances and emits `PaymentSettled` events with
unique receipt IDs. Merchants withdraw via `withdrawMerchantBalance()`.

## Architecture (5-layer Web2.5 model)

```
[Layer 1] Intent capture (Web2 surface)
   QRIS scan · REST webhook · chat cmd
        │  "pay 18000 IDR to WARUNG PAK DANU"
        ▼
[Layer 2] Translation / orchestration (the agent core)
   parse → validate CRC16 → FX convert → identity check → policy gate
        │  IDR 18000 → stablecoin 1.0 → verified → allowed
        ▼
[Layer 3] Settlement (Web3)
   direct ERC20 transfer  OR  x402/MPP 402-challenge → credential → retry
        │  on-chain stablecoin moves; tx hash is the proof
        ▼
[Layer 4] Reconciliation / off-ramp (Web2.5)
   PSP converts stablecoin→IDR; receipt recorded for audit
        │
        ▼
[Layer 5] Reporting (Web2 surface + Greenfield memory)
   200 OK · receipt · balance update · reputation update · audit log
```

### File mapping

```
src/qris.ts            QRIS parse + CRC16-CCITT (EMVCo TLV, pure TS, no deps)
src/tokens.ts          Curated BNB Chain stablecoin registry (BUSD, FDUSD, $U)
src/rates.ts           IDR → any stablecoin (static | CoinGecko, multi-token)
src/offramp.ts         Settlement address seam (local | TransFi PSP stub)
src/identity.ts        ERC-8004 agent identity + reputation + gate
src/policy.ts          Spend guardrails (per-tx cap, daily cap, allowlist)
src/receipts.ts        Payment receipt log (Greenfield memory seam)
src/payment.ts         BnbPaymentExecutor (direct transfer | x402/MPP)
src/agent.ts           QrisPayAgent orchestrator (plan → policy → execute → receipt)
src/charge-server.ts   Minimal 402 server for the x402/MPP loop demo
contracts/MockBUSD.sol       18-decimal stablecoin stand-in
contracts/QrisPaymentVault.sol  Real escrow: settle ERC20 to merchant + receiptId
scripts/deploy-vault.ts      Hardhat deploy script for QrisPaymentVault
test/*.test.ts              75 passing tests
web-ui/                     Interactive React + Vite + Tailwind frontend
web-ui/src/App.jsx          7-step pipeline UI with optical-illusion design
web-ui/src/useWallet.jsx    MetaMask wallet connect (ethers.js v6)
web-ui/src/qris.js          Browser QRIS parser + CRC16-CCITT
```

## Usage

```ts
import { buildQris } from "./src/qris";
import { QrisPayAgent } from "./src/agent";
import { BnbPaymentExecutor } from "./src/payment";
import { LocalSettlementAddress } from "./src/offramp";
import { defaultRegistry } from "./src/tokens";

// 1. Ingest a scanned QRIS code.
const code = buildQris({ /* ... */ });

// 2. Wire the executor + multi-token + spend guardrails.
const executor = new BnbPaymentExecutor({
  rpcUrl: "",
  chainId: 31337,
  busdAddress,
});
executor.attachEthersSigner(payerSigner);

// 3. Plan (dry-run: parse + convert + identity + policy check, no broadcast).
const agent = new QrisPayAgent({
  payment: executor,
  offramp: new LocalSettlementAddress(merchantAddress),
  token: defaultRegistry.resolve("fdusd"), // settle in FDUSD
  spendRules: {
    perTxCap: 10n * 10n ** 18n,    // max 10 stablecoin per tx
    dailyCap: 100n * 10n ** 18n,    // max 100 per day
    allowlist: [merchantAddress],   // only pay known merchants
  },
});

const plan = await agent.plan(code);
if (!plan.crcValid) throw new Error("tampered QRIS");
if (plan.policyAllowed === false) throw new Error(plan.policyReason);

// 4. Execute → on-chain settlement + receipt recorded.
const result = await agent.execute(plan);
console.log(result.txHash, result.receipt.receiptId);
```

### x402 / MPP mode

Set `MPP_PROTECTED_URL` to a running `@bnb-chain/mpp` charge-server. The agent
will fetch the `402` challenge, build a stablecoin `authorization` credential
via the verified `ClientMppx` flow, then retry so the server settles. See
https://docs.bnbchain.org/developer-kit/mpp-sdk/.

## Going to production

| Demo piece | Production swap |
| --- | --- |
| `MockBUSD` | Real BSC stablecoin (BUSD `0xe9e7…`, FDUSD `0xc5f0…`, $U `0x4e59…`) |
| `StaticRateSource` | `CoinGeckoRateSource` or oracle / PSP quote |
| `LocalSettlementAddress` | TransFi / PSP off-ramp |
| `LocalIdentityProvider` | ERC-8004 registry contract (gas-free via MegaFuel) |
| `LocalReceiptLog` | BNB Greenfield durable storage |
| ethers local signer | `PRIVATE_KEY` + BSC RPC (viem http transport) |

QRIS limits (Bank Indonesia): 500 USD/tx, 1,500 USD/day, 10,000 USD/month.

## Security Notes

- CRC16 validated **before** any conversion/payment — tampered codes are rejected.
- Only IDR (`360`) dynamic QRIS (with amount tag `54`) are payable.
- Spend policy is enforced **before** broadcast — the agent never silently
  exceeds its guardrails.
- Reputation gate restricts new/low-reputation agents from high-value payments.
- On-chain leg is checks-effects: the ERC20 transfer is the only state change.
- PSP seam is explicit — never hard-code a settlement address you don't control.
- The agent is a hot wallet. Prefer scoped keys, spending caps, EIP-3009
  gasless transfers, and a separate settlement address per PSP.

## License

GPL-3.0 (matches example-hub).

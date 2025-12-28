# Auto-Mass Payouts

Batch BNB or ERC-20 payouts from a single wallet using a CSV file. Designed for rewards, vendor payments, and grants
with safeguards like dry-runs and batching.

## Features

- CSV-driven payouts (`address,amount`)
- Native BNB or ERC-20 transfers
- Dry-run mode with totals and validation
- Batch sizing and optional delay between transactions

## Prerequisites

- Node.js 18+
- A funded wallet on BSC or opBNB (testnet recommended)

## Installation

```bash
cd typescript/auto-mass-payouts
npm install
```

## Setup

Create your env file:

```bash
cp .env.example .env
```

Update `.env` with your RPC endpoint and private key.
Private keys are only required when sending transactions, not for dry-runs.

## CSV Format

`payouts.csv` example:

```csv
address,amount
0x000000000000000000000000000000000000dEaD,0.01
0x0000000000000000000000000000000000000001,0.02
```

## Run

Dry-run (validate + totals only):

```bash
npm run payout -- --csv payouts.csv --dry-run
```

Send BNB payouts:

```bash
npm run payout -- --csv payouts.csv
```

Send ERC-20 payouts:

```bash
npm run payout -- --csv payouts.csv --token 0xYourTokenAddress --decimals 18
```

Example (BSC testnet token):

```bash
npm run payout -- --csv payouts.csv --token 0x524bC91Dc82d6b90EF29F76A3ECAaBAffFD490Bc --decimals 18
```

## Testing on Testnet

1. Create a fresh test wallet and add its private key to `.env`.
2. Get testnet BNB from a faucet and confirm the balance.
3. Run a dry-run first, then send a small batch.

## Security Notes

- Never commit `.env` or share private keys.
- Use fresh test wallets for demos and rotate keys after sharing or troubleshooting.

## Options

```
--csv <path>           CSV file with address,amount columns (required)
--rpc-url <url>        RPC URL (default: RPC_URL in .env)
--private-key <key>    Private key (default: PRIVATE_KEY in .env)
--token <address>      ERC-20 token address (omit for native BNB)
--decimals <number>    Token decimals override (auto-detected if omitted)
--batch-size <number>  Number of transfers per batch (default: 20)
--delay-ms <number>    Delay between transactions in ms (default: 0)
--confirmations <num>  Confirmations to wait for (default: 1)
--dry-run              Validate and show totals only
```

## Safety Notes

- Use testnet first and confirm balances before mainnet runs.
- Keep extra BNB for gas when sending native payouts.
- Re-run with a trimmed CSV if you need to retry failed addresses.

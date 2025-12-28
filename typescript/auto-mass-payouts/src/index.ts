import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { config as loadEnv } from "dotenv";
import { ethers } from "ethers";

type Options = {
  csvPath?: string;
  rpcUrl?: string;
  privateKey?: string;
  tokenAddress?: string;
  decimals?: number;
  batchSize: number;
  delayMs: number;
  confirmations: number;
  dryRun: boolean;
};

type RawRecipient = {
  address: string;
  amount: string;
  line: number;
};

type Recipient = {
  address: string;
  amount: bigint;
  line: number;
};

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_CONFIRMATIONS = 1;

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

loadEnv();

const usage = `Auto-Mass Payouts (BNB + ERC-20)

Usage:
  npm run payout -- --csv payouts.csv [options]

Options:
  --csv <path>           CSV file with address,amount columns (required)
  --rpc-url <url>        RPC URL (default: RPC_URL in .env)
  --private-key <key>    Private key (default: PRIVATE_KEY in .env)
  --token <address>      ERC-20 token address (omit for native BNB)
  --decimals <number>    Token decimals override (auto-detected if omitted)
  --batch-size <number>  Number of transfers per batch (default: 20)
  --delay-ms <number>    Delay between transactions in ms (default: 0)
  --confirmations <num>  Confirmations to wait for (default: 1)
  --dry-run              Validate and show totals only
  --help                 Show help
`;

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    batchSize: DEFAULT_BATCH_SIZE,
    delayMs: 0,
    confirmations: DEFAULT_CONFIRMATIONS,
    dryRun: false
  };

  const getValue = (flag: string, inlineValue: string | undefined, nextValue?: string) => {
    if (inlineValue !== undefined) {
      if (inlineValue.length === 0) {
        throw new Error(`Missing value for ${flag}.`);
      }
      return inlineValue;
    }

    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for ${flag}.`);
    }

    return nextValue;
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const [flag, inlineValue] = arg.split("=");
    const nextValue = args[i + 1];

    switch (flag) {
      case "--csv":
        options.csvPath = getValue(flag, inlineValue, nextValue);
        if (!inlineValue) i += 1;
        break;
      case "--rpc-url":
        options.rpcUrl = getValue(flag, inlineValue, nextValue);
        if (!inlineValue) i += 1;
        break;
      case "--private-key":
        options.privateKey = getValue(flag, inlineValue, nextValue);
        if (!inlineValue) i += 1;
        break;
      case "--token":
        options.tokenAddress = getValue(flag, inlineValue, nextValue);
        if (!inlineValue) i += 1;
        break;
      case "--decimals":
        options.decimals = Number(getValue(flag, inlineValue, nextValue));
        if (!inlineValue) i += 1;
        break;
      case "--batch-size":
        options.batchSize = Number(getValue(flag, inlineValue, nextValue));
        if (!inlineValue) i += 1;
        break;
      case "--delay-ms":
        options.delayMs = Number(getValue(flag, inlineValue, nextValue));
        if (!inlineValue) i += 1;
        break;
      case "--confirmations":
        options.confirmations = Number(getValue(flag, inlineValue, nextValue));
        if (!inlineValue) i += 1;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        console.log(usage);
        process.exit(1);
    }
  }

  return options;
}

function readRecipients(csvPath: string): RawRecipient[] {
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Array<Record<string, string>>;

  if (!records.length) {
    throw new Error("CSV has no rows. Expected columns: address,amount");
  }

  return records.map((row, index) => {
    const address = (row.address ?? "").trim();
    const amount = (row.amount ?? "").trim();

    if (!address || !amount) {
      throw new Error(
        `Missing address or amount on line ${index + 2}. Expected columns: address,amount`
      );
    }

    let checksum = "";
    try {
      checksum = ethers.getAddress(address);
    } catch {
      throw new Error(`Invalid address on line ${index + 2}: ${address}`);
    }

    return {
      address: checksum,
      amount,
      line: index + 2
    };
  });
}

function parseRecipients(raw: RawRecipient[], decimals: number): Recipient[] {
  return raw.map((recipient) => {
    let value: bigint;
    try {
      value = ethers.parseUnits(recipient.amount, decimals);
    } catch {
      throw new Error(
        `Invalid amount on line ${recipient.line}: ${recipient.amount}`
      );
    }

    if (value <= 0n) {
      throw new Error(`Amount must be > 0 on line ${recipient.line}`);
    }

    return {
      address: recipient.address,
      amount: value,
      line: recipient.line
    };
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs();

  const csvPath = options.csvPath;
  if (!csvPath) {
    console.error("Missing required --csv argument.");
    console.log(usage);
    process.exit(1);
  }

  const rpcUrl = options.rpcUrl ?? process.env.RPC_URL;
  const privateKey = options.privateKey ?? process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("Missing RPC URL. Provide --rpc-url or RPC_URL in .env.");
  }

  if (
    Number.isNaN(options.batchSize) ||
    !Number.isInteger(options.batchSize) ||
    options.batchSize < 1
  ) {
    throw new Error("--batch-size must be an integer >= 1.");
  }

  if (
    Number.isNaN(options.confirmations) ||
    !Number.isInteger(options.confirmations) ||
    options.confirmations < 0
  ) {
    throw new Error("--confirmations must be an integer >= 0.");
  }

  if (
    Number.isNaN(options.delayMs) ||
    !Number.isInteger(options.delayMs) ||
    options.delayMs < 0
  ) {
    throw new Error("--delay-ms must be an integer >= 0.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  let wallet: ethers.Wallet | undefined;

  if (privateKey) {
    try {
      wallet = new ethers.Wallet(privateKey, provider);
    } catch {
      throw new Error("Invalid PRIVATE_KEY.");
    }
  } else if (!options.dryRun) {
    throw new Error(
      "Missing PRIVATE_KEY. Provide --private-key or PRIVATE_KEY in .env."
    );
  }

  const network = await provider.getNetwork();

  const tokenAddress = options.tokenAddress;
  if (
    options.decimals !== undefined &&
    (Number.isNaN(options.decimals) ||
      !Number.isInteger(options.decimals) ||
      options.decimals < 0)
  ) {
    throw new Error("--decimals must be an integer >= 0.");
  }

  let decimals = options.decimals ?? 18;
  let symbol = "BNB";
  let token: ethers.Contract | undefined;

  if (tokenAddress) {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet ?? provider);

    if (options.decimals === undefined) {
      decimals = Number(await token.decimals());
    }

    if (Number.isNaN(decimals) || !Number.isInteger(decimals) || decimals < 0) {
      throw new Error("Token decimals could not be determined.");
    }

    try {
      symbol = await token.symbol();
    } catch {
      symbol = "TOKEN";
    }
  }

  const rawRecipients = readRecipients(csvPath);
  const recipients = parseRecipients(rawRecipients, decimals);

  const total = recipients.reduce((sum, recipient) => sum + recipient.amount, 0n);
  const formattedTotal = ethers.formatUnits(total, decimals);

  console.log("--------------------------------------------------");
  console.log(`Network: ${network.name} (${network.chainId})`);
  if (wallet) {
    console.log(`Sender: ${wallet.address}`);
  } else {
    console.log("Sender: (not provided)");
  }
  console.log(`Recipients: ${recipients.length}`);
  console.log(`Total: ${formattedTotal} ${symbol}`);
  console.log(`Mode: ${tokenAddress ? "ERC-20" : "BNB"}`);
  console.log("--------------------------------------------------");

  if (options.dryRun) {
    console.log("Dry-run complete. No transactions were sent.");
    return;
  }

  if (!wallet) {
    throw new Error(
      "Wallet is required for sending transactions. Provide a PRIVATE_KEY."
    );
  }

  if (token) {
    const balance = (await token.balanceOf(wallet.address)) as bigint;
    if (balance < total) {
      throw new Error(
        `Insufficient token balance. Have ${ethers.formatUnits(
          balance,
          decimals
        )} ${symbol}, need ${formattedTotal} ${symbol}.`
      );
    }

    const gasBalance = await provider.getBalance(wallet.address);
    if (gasBalance === 0n) {
      throw new Error("Insufficient BNB for gas. Top up the sender wallet.");
    }
  } else {
    const balance = await provider.getBalance(wallet.address);
    if (balance <= total) {
      throw new Error(
        "Insufficient BNB balance for payouts and gas. Top up the sender wallet."
      );
    }
  }

  const batches = chunk(recipients, options.batchSize);
  console.log(`Sending ${recipients.length} payouts in ${batches.length} batches.`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    console.log(`Batch ${batchIndex + 1}/${batches.length}`);

    for (const recipient of batch) {
      let tx: ethers.TransactionResponse;
      if (token) {
        tx = await token.transfer(recipient.address, recipient.amount);
      } else {
        tx = await wallet.sendTransaction({
          to: recipient.address,
          value: recipient.amount
        });
      }

      console.log(
        `Sent ${ethers.formatUnits(recipient.amount, decimals)} ${symbol} to ${
          recipient.address
        } | tx ${tx.hash}`
      );

      if (options.confirmations > 0) {
        await tx.wait(options.confirmations);
      }

      if (options.delayMs > 0) {
        await sleep(options.delayMs);
      }
    }
  }

  console.log("All payouts completed.");
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

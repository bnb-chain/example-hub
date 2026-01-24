/**
 * RPC Block Explorer — BSC block and transaction explorer via JSON-RPC.
 * Fetches block data, transactions, and details from BNB Smart Chain.
 */

import "dotenv/config";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org";

export interface Block {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: string;
  extraData: string;
  transactions: Transaction[];
  transactionCount: number;
}

export interface Transaction {
  hash: string;
  blockNumber: string;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  nonce: string;
  input: string;
  transactionIndex: string;
  status?: string;
}

export interface BlockSummary {
  number: number;
  hash: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
}

/** Convert hex string to number. */
export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

/** Convert hex string to bigint. */
export function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

/** Format wei to BNB (18 decimals). */
export function weiToBnb(wei: string | bigint): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const divisor = BigInt(10 ** 18);
  const whole = value / divisor;
  const remainder = value % divisor;
  if (remainder === BigInt(0)) return whole.toString();
  const decimals = remainder.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${decimals}`;
}

/** Format gas price from wei to Gwei. */
export function weiToGwei(wei: string | bigint): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const gwei = value / BigInt(10 ** 9);
  return gwei.toString();
}

/** Validate block number or hash format. */
export function isValidBlockInput(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === "latest" || trimmed === "earliest" || trimmed === "pending") return true;
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return true; // block hash
  if (/^[0-9]+$/.test(trimmed)) return true; // decimal block number
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return true; // hex block number
  return false;
}

/** Normalize block input to RPC format. */
export function normalizeBlockInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "latest" || trimmed === "earliest" || trimmed === "pending") return trimmed;
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed; // hash
  if (/^[0-9]+$/.test(trimmed)) return `0x${parseInt(trimmed, 10).toString(16)}`; // decimal to hex
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return trimmed; // already hex
  return trimmed;
}

/** Make JSON-RPC call to BSC. */
async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(BSC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string; code: number } };
  if (json.error) throw new Error(`RPC error: ${json.error.message} (code: ${json.error.code})`);
  if (!("result" in json)) throw new Error("Missing RPC result");
  return json.result as T;
}

/** Get latest block number. */
export async function getLatestBlockNumber(): Promise<number> {
  const hex = await rpcCall<string>("eth_blockNumber", []);
  return hexToNumber(hex);
}

/** Get block by number or hash. */
export async function getBlock(blockInput: string, includeTransactions = false): Promise<Block | null> {
  const normalized = normalizeBlockInput(blockInput);
  const full = includeTransactions ? "true" : "false";
  const block = await rpcCall<{
    number?: string;
    hash?: string;
    parentHash?: string;
    timestamp?: string;
    gasLimit?: string;
    gasUsed?: string;
    miner?: string;
    difficulty?: string;
    totalDifficulty?: string;
    size?: string;
    extraData?: string;
    transactions?: Array<string | Transaction>;
  } | null>("eth_getBlockByNumber", [normalized, full === "true"]);

  if (!block || !block.number) return null;

  const transactions: Transaction[] = [];
  if (Array.isArray(block.transactions)) {
    for (const tx of block.transactions) {
      if (typeof tx === "string") {
        // Transaction hash only
        const txData = await getTransaction(tx);
        if (txData) transactions.push(txData);
      } else {
        // Full transaction object
        transactions.push(tx as Transaction);
      }
    }
  }

  return {
    number: block.number,
    hash: block.hash || "",
    parentHash: block.parentHash || "",
    timestamp: block.timestamp || "0x0",
    gasLimit: block.gasLimit || "0x0",
    gasUsed: block.gasUsed || "0x0",
    miner: block.miner || "",
    difficulty: block.difficulty || "0x0",
    totalDifficulty: block.totalDifficulty || "0x0",
    size: block.size || "0x0",
    extraData: block.extraData || "0x",
    transactions,
    transactionCount: transactions.length,
  };
}

/** Get transaction by hash. */
export async function getTransaction(txHash: string): Promise<Transaction | null> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) return null;
  const tx = await rpcCall<{
    hash?: string;
    blockNumber?: string;
    blockHash?: string;
    from?: string;
    to?: string | null;
    value?: string;
    gas?: string;
    gasPrice?: string;
    nonce?: string;
    input?: string;
    transactionIndex?: string;
  } | null>("eth_getTransactionByHash", [txHash]);

  if (!tx || !tx.hash) return null;

  // Get transaction receipt for status
  let status: string | undefined;
  try {
    const receipt = await rpcCall<{ status?: string } | null>("eth_getTransactionReceipt", [txHash]);
    if (receipt?.status !== undefined) {
      status = receipt.status === "0x1" ? "success" : "failed";
    }
  } catch {
    // Receipt might not be available
  }

  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber || "",
    blockHash: tx.blockHash || "",
    from: tx.from || "",
    to: tx.to || null,
    value: tx.value || "0x0",
    gas: tx.gas || "0x0",
    gasPrice: tx.gasPrice || "0x0",
    nonce: tx.nonce || "0x0",
    input: tx.input || "0x",
    transactionIndex: tx.transactionIndex || "0x0",
    status,
  };
}

/** Get block summary (lightweight). */
export async function getBlockSummary(blockInput: string): Promise<BlockSummary | null> {
  const block = await getBlock(blockInput, false);
  if (!block) return null;
  return {
    number: hexToNumber(block.number),
    hash: block.hash,
    timestamp: hexToNumber(block.timestamp),
    transactionCount: block.transactionCount,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    miner: block.miner,
  };
}

function main(): void {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(__dirname, "..", "frontend.html"), "utf-8"));
  });

  app.get("/api/latest", async (_req, res) => {
    try {
      const blockNumber = await getLatestBlockNumber();
      res.json({ blockNumber });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch latest block";
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/block/:input", async (req, res) => {
    const input = req.params.input;
    if (!isValidBlockInput(input)) {
      res.status(400).json({ error: "Invalid block number or hash" });
      return;
    }
    try {
      const block = await getBlock(input, true);
      if (!block) {
        res.status(404).json({ error: "Block not found" });
        return;
      }
      res.json(block);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch block";
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/transaction/:hash", async (req, res) => {
    const hash = req.params.hash;
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      res.status(400).json({ error: "Invalid transaction hash" });
      return;
    }
    try {
      const tx = await getTransaction(hash);
      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }
      res.json(tx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch transaction";
      res.status(500).json({ error: msg });
    }
  });

  function tryListen(port: number): void {
    const server = app.listen(port, () => {
      console.log(`RPC Block Explorer running at http://localhost:${port}`);
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      server.close();
      if (err.code === "EADDRINUSE" && port < PORT + 5) {
        const next = port + 1;
        console.warn(`Port ${port} in use, trying ${next}...`);
        tryListen(next);
      } else {
        console.error(err.code === "EADDRINUSE"
          ? `Port ${port} in use. Set PORT in .env or stop the other process.`
          : err);
        process.exit(1);
      }
    });
  }
  tryListen(PORT);
}

if (process.env.VITEST !== "true") main();

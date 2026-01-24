/**
 * Whale Tracker — BSC whale transaction tracker.
 * Tracks large transactions and whale movements on BNB Smart Chain.
 */

import "dotenv/config";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org";
const DEFAULT_MIN_WHALE_VALUE_BNB = Number(process.env.MIN_WHALE_VALUE_BNB) || 10;

export interface WhaleTransaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  from: string;
  to: string | null;
  value: string; // in wei (hex)
  valueBNB: string; // formatted BNB
  gas: string;
  gasPrice: string;
  status?: string;
}

export interface WhaleTrackerResult {
  transactions: WhaleTransaction[];
  totalValue: string; // total BNB value
  blockRange: {
    from: number;
    to: number;
  };
  minValueBNB: number;
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

/** Check if transaction value meets whale threshold. */
export function isWhaleTransaction(valueWei: string | bigint, minValueBNB: number): boolean {
  const value = typeof valueWei === "string" ? BigInt(valueWei) : valueWei;
  const minValueWei = BigInt(Math.floor(minValueBNB * 10 ** 18));
  return value >= minValueWei;
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

/** Get block by number. */
async function getBlock(blockNumber: number, includeTransactions = true): Promise<{
  number: string;
  hash: string;
  timestamp: string;
  transactions: Array<{
    hash: string;
    from: string;
    to: string | null;
    value: string;
    gas: string;
    gasPrice: string;
    blockNumber: string;
    blockHash: string;
  }>;
} | null> {
  const blockHex = `0x${blockNumber.toString(16)}`;
  const block = await rpcCall<{
    number?: string;
    hash?: string;
    timestamp?: string;
    transactions?: Array<string | {
      hash: string;
      from: string;
      to: string | null;
      value: string;
      gas: string;
      gasPrice: string;
      blockNumber: string;
      blockHash: string;
    }>;
  } | null>("eth_getBlockByNumber", [blockHex, includeTransactions]);

  if (!block || !block.number) return null;

  const transactions: Array<{
    hash: string;
    from: string;
    to: string | null;
    value: string;
    gas: string;
    gasPrice: string;
    blockNumber: string;
    blockHash: string;
  }> = [];

  if (Array.isArray(block.transactions)) {
    for (const tx of block.transactions) {
      if (typeof tx === "object" && tx !== null && "hash" in tx) {
        transactions.push(tx as {
          hash: string;
          from: string;
          to: string | null;
          value: string;
          gas: string;
          gasPrice: string;
          blockNumber: string;
          blockHash: string;
        });
      }
    }
  }

  return {
    number: block.number,
    hash: block.hash || "",
    timestamp: block.timestamp || "0x0",
    transactions,
  };
}

/** Get transaction receipt for status. */
async function getTransactionReceipt(txHash: string): Promise<{ status?: string } | null> {
  try {
    const receipt = await rpcCall<{ status?: string } | null>("eth_getTransactionReceipt", [txHash]);
    return receipt;
  } catch {
    return null;
  }
}

/** Track whale transactions in a block range. */
export async function trackWhales(
  fromBlock: number,
  toBlock: number,
  minValueBNB: number = DEFAULT_MIN_WHALE_VALUE_BNB,
  targetAddress?: string
): Promise<WhaleTrackerResult> {
  const whaleTransactions: WhaleTransaction[] = [];
  let totalValue = BigInt(0);

  // Process blocks in reverse order (newest first)
  for (let blockNum = toBlock; blockNum >= fromBlock && blockNum >= 0; blockNum--) {
    try {
      const block = await getBlock(blockNum, true);
      if (!block) continue;

      const timestamp = hexToNumber(block.timestamp);

      for (const tx of block.transactions) {
        const valueWei = tx.value || "0x0";
        
        // Skip zero-value transactions
        if (valueWei === "0x0" || valueWei === "0x") continue;

        // Check if meets whale threshold
        if (!isWhaleTransaction(valueWei, minValueBNB)) continue;

        // Filter by target address if provided
        if (targetAddress) {
          const targetLower = targetAddress.toLowerCase();
          if (
            tx.from.toLowerCase() !== targetLower &&
            (tx.to?.toLowerCase() || "") !== targetLower
          ) {
            continue;
          }
        }

        // Get transaction status
        let status: string | undefined;
        try {
          const receipt = await getTransactionReceipt(tx.hash);
          if (receipt?.status !== undefined) {
            status = receipt.status === "0x1" ? "success" : "failed";
          }
        } catch {
          // Status unavailable
        }

        const valueBNB = weiToBnb(valueWei);
        const valueBigInt = hexToBigInt(valueWei);
        totalValue += valueBigInt;

        whaleTransactions.push({
          hash: tx.hash,
          blockNumber: hexToNumber(tx.blockNumber || block.number),
          blockHash: tx.blockHash || block.hash,
          timestamp,
          from: tx.from,
          to: tx.to,
          value: valueWei,
          valueBNB,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          status,
        });
      }
    } catch (error) {
      // Skip blocks that fail to fetch
      console.error(`Error fetching block ${blockNum}:`, error);
      continue;
    }
  }

  return {
    transactions: whaleTransactions,
    totalValue: weiToBnb(totalValue.toString()),
    blockRange: { from: fromBlock, to: toBlock },
    minValueBNB,
  };
}

/** Track recent whale transactions. */
export async function trackRecentWhales(
  blockCount: number = 10,
  minValueBNB: number = DEFAULT_MIN_WHALE_VALUE_BNB,
  targetAddress?: string
): Promise<WhaleTrackerResult> {
  const latestBlock = await getLatestBlockNumber();
  const fromBlock = Math.max(0, latestBlock - blockCount + 1);
  return trackWhales(fromBlock, latestBlock, minValueBNB, targetAddress);
}

function main(): void {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(__dirname, "..", "frontend.html"), "utf-8"));
  });

  app.get("/api/latest-block", async (_req, res) => {
    try {
      const blockNumber = await getLatestBlockNumber();
      res.json({ blockNumber });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch latest block";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/track-whales", async (req, res) => {
    try {
      const { fromBlock, toBlock, blockCount, minValueBNB, targetAddress } = req.body;

      let result: WhaleTrackerResult;

      if (fromBlock !== undefined && toBlock !== undefined) {
        // Track specific block range
        const from = Number(fromBlock);
        const to = Number(toBlock);
        const minValue = minValueBNB ? Number(minValueBNB) : DEFAULT_MIN_WHALE_VALUE_BNB;
        result = await trackWhales(from, to, minValue, targetAddress);
      } else if (blockCount !== undefined) {
        // Track recent blocks
        const count = Number(blockCount) || 10;
        const minValue = minValueBNB ? Number(minValueBNB) : DEFAULT_MIN_WHALE_VALUE_BNB;
        result = await trackRecentWhales(count, minValue, targetAddress);
      } else {
        // Default: track last 10 blocks
        const minValue = minValueBNB ? Number(minValueBNB) : DEFAULT_MIN_WHALE_VALUE_BNB;
        result = await trackRecentWhales(10, minValue, targetAddress);
      }

      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to track whales";
      res.status(500).json({ error: msg });
    }
  });

  app.listen(PORT, () => {
    console.log(`Whale Tracker running at http://localhost:${PORT}`);
  });
}

if (process.env.VITEST !== "true") main();

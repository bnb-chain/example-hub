import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When running from dist/app.js, __dirname is dist/, so go up one level to project root
const PROJECT_ROOT = path.basename(__dirname) === "dist" 
  ? path.resolve(__dirname, "..") 
  : __dirname;

const BSC_RPC_URL = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org";
const DEFAULT_SAMPLE_BLOCKS = 5;

export type Block = {
  number: string;
  timestamp: string;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
};

export type Metrics = {
  blockNumber: number;
  blockTimeSeconds: number;
  gasPriceGwei: number;
  tps: number;
  rpcLatencyMs: number;
  gasUsedPercent: number;
  sampleBlocks: number;
};

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const t0 = Date.now();
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
  const elapsed = Date.now() - t0;
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (!("result" in json)) throw new Error("Missing RPC result");
  (json as { _rpcLatencyMs?: number })._rpcLatencyMs = elapsed;
  return json.result as T;
}

export async function getBlockNumber(): Promise<number> {
  const hex = await rpcCall<string>("eth_blockNumber", []);
  return parseInt(hex, 16);
}

export async function getBlock(blockNumber: number | "latest"): Promise<Block | null> {
  const tag = blockNumber === "latest" ? "latest" : `0x${blockNumber.toString(16)}`;
  const raw = await rpcCall<{
    number: string;
    timestamp: string;
    transactions: string[];
    gasUsed: string;
    gasLimit: string;
  } | null>("eth_getBlockByNumber", [tag, false]);
  if (!raw) return null;
  return {
    number: raw.number,
    timestamp: raw.timestamp,
    transactions: raw.transactions,
    gasUsed: raw.gasUsed,
    gasLimit: raw.gasLimit,
  };
}

export async function getGasPrice(): Promise<bigint> {
  const hex = await rpcCall<string>("eth_gasPrice", []);
  return BigInt(hex);
}

async function rpcWithLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const t0 = Date.now();
  const result = await fn();
  const latencyMs = Date.now() - t0;
  return { result, latencyMs };
}

export async function getBlockTime(): Promise<number> {
  const [latest, prev] = await Promise.all([
    getBlock("latest"),
    getBlockNumber().then((n) => getBlock(n - 1)),
  ]);
  if (!latest || !prev) return 0;
  const t1 = parseInt(latest.timestamp, 16);
  const t0 = parseInt(prev.timestamp, 16);
  return Math.max(0, t1 - t0);
}

export async function getRecentTPS(sampleBlocks: number = DEFAULT_SAMPLE_BLOCKS): Promise<number> {
  const latest = await getBlockNumber();
  const blocks: Block[] = [];
  for (let i = 0; i < sampleBlocks; i++) {
    const b = await getBlock(latest - i);
    if (b) blocks.push(b);
  }
  if (blocks.length < 2) return 0;
  const totalTxs = blocks.reduce((s, b) => s + b.transactions.length, 0);
  const oldest = blocks[blocks.length - 1];
  const newest = blocks[0];
  const timeSpan = parseInt(newest.timestamp, 16) - parseInt(oldest.timestamp, 16);
  if (timeSpan <= 0) return 0;
  return totalTxs / timeSpan;
}

export async function getMetrics(sampleBlocks: number = DEFAULT_SAMPLE_BLOCKS): Promise<Metrics> {
  const t0 = Date.now();
  const [blockNumRes, gasRes, latestBlock, prevBlock] = await Promise.all([
    rpcWithLatency(() => getBlockNumber()),
    rpcWithLatency(() => getGasPrice()),
    getBlock("latest"),
    getBlockNumber().then((n) => getBlock(n - 1)),
  ]);
  const blockNumber = blockNumRes.result;
  const gasPriceWei = gasRes.result;
  const rpcLatencyMs = Math.max(blockNumRes.latencyMs, gasRes.latencyMs, Date.now() - t0);

  let blockTimeSeconds = 0;
  if (latestBlock && prevBlock) {
    const t1 = parseInt(latestBlock.timestamp, 16);
    const t0 = parseInt(prevBlock.timestamp, 16);
    blockTimeSeconds = Math.max(0, t1 - t0);
  }

  const gasPriceGwei = Number(gasPriceWei) / 1e9;
  let gasUsedPercent = 0;
  if (latestBlock) {
    const used = parseInt(latestBlock.gasUsed, 16);
    const limit = parseInt(latestBlock.gasLimit, 16);
    gasUsedPercent = limit > 0 ? (used / limit) * 100 : 0;
  }

  const tps = await getRecentTPS(sampleBlocks);

  return {
    blockNumber,
    blockTimeSeconds,
    gasPriceGwei,
    tps,
    rpcLatencyMs,
    gasUsedPercent,
    sampleBlocks,
  };
}

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(express.static(PROJECT_ROOT));

  app.get("/api/metrics", async (_req, res) => {
    try {
      const sample = parseInt(String(_req.query.sample ?? DEFAULT_SAMPLE_BLOCKS), 10) || DEFAULT_SAMPLE_BLOCKS;
      const metrics = await getMetrics(Math.min(20, Math.max(2, sample)));
      res.json(metrics);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, "index.html"));
  });

  return app;
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Chain performance monitoring running at http://localhost:${PORT}`);
  });
}

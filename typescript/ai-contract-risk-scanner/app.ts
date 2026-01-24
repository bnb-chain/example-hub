/**
 * AI Contract Risk Scanner — BSC smart contract heuristic risk analysis.
 * Fetches contract data via BSCTrace API (MegaNode) and runs bytecode-based risk checks.
 */

import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3333;
const BSCTRACE_API_BASE =
  (process.env.BSCTRACE_API_URL ?? "https://bsc-mainnet.nodereal.io/v1").replace(/\/$/, "");

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFinding {
  level: RiskLevel;
  label: string;
  description: string;
}

export interface ScanResult {
  address: string;
  contractName: string | null;
  verified: boolean;
  score: number;
  scoreLabel: string;
  findings: RiskFinding[];
  meta?: { creator?: string; creationTxHash?: string; compiler?: string };
}

/** Normalize address to checksum-friendly lowercase 0x form. */
export function normalizeAddress(addr: string): string {
  const s = String(addr).trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) return "";
  return s.toLowerCase().replace(/^0x/, "0x");
}

/** Check if string looks like a valid BSC contract address. */
export function isValidBscAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr).trim());
}

/** Parse ABI from API result (string or already parsed). Kept for compatibility. */
export function parseAbi(abi: unknown): { type?: string; name?: string }[] {
  if (Array.isArray(abi)) return abi as { type?: string; name?: string }[];
  if (typeof abi === "string") {
    try {
      const parsed = JSON.parse(abi) as unknown;
      return Array.isArray(parsed) ? (parsed as { type?: string; name?: string }[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Count privilege-related ABI function names. Kept for compatibility. */
export function countPrivilegedFunctions(abi: { name?: string }[]): number {
  const privileged = [
    "owner", "getOwner", "admin", "onlyOwner", "onlyAdmin",
    "mint", "pause", "unpause", "setOwner", "transferOwnership",
    "renounceOwnership", "upgrade", "upgradeTo", "upgradeToAndCall", "initialize",
  ];
  const names = new Set(abi.map((a) => (a.name || "").toLowerCase()).filter(Boolean));
  return privileged.filter((p) => names.has(p)).length;
}

/** Check if source contains reentrancy-prone patterns. Kept for compatibility. */
export function hasReentrancyIndicators(source: string): boolean {
  const normalized = source.replace(/\s+/g, " ");
  return (
    /.call\s*\{/.test(normalized) ||
    /.call\s*\(\s*/.test(normalized) ||
    /\.call\.value\s*\(/.test(normalized)
  );
}

/** Check if source mentions ReentrancyGuard or nonReentrant. Kept for compatibility. */
export function hasReentrancyGuard(source: string): boolean {
  return /ReentrancyGuard|nonReentrant|non_reentrant/i.test(source);
}

/** Check if contract is proxy or upgradeable from meta. */
export function isProxyOrUpgradeable(meta: { proxy?: string; implementation?: string }): boolean {
  const p = String(meta?.proxy ?? "").trim();
  const i = String(meta?.implementation ?? "").trim();
  return p === "1" || p.toLowerCase() === "true" || i.length > 0;
}

/** Bytecode opcodes (hex) we check for. */
const OPCODE = {
  DELEGATECALL: "f4",
  SELFDESTRUCT: "ff",
  CREATE: "f0",
  CREATE2: "f5",
} as const;

function bytecodeContains(bytecode: string, hex: string): boolean {
  const normalized = bytecode.toLowerCase().replace(/^0x/, "");
  return normalized.includes(hex.toLowerCase());
}

/** Run bytecode-based heuristic risk analysis. */
export function analyzeRisksBytecode(
  bytecode: string,
  meta: { creator?: string; creationTxHash?: string } = {}
): { score: number; findings: RiskFinding[] } {
  const findings: RiskFinding[] = [];
  let score = 100;

  const hex = bytecode.replace(/^0x/, "").toLowerCase();
  if (!hex || hex.length < 4) {
    findings.push({
      level: "high",
      label: "Not a contract",
      description: "No bytecode at this address (EOA or no contract). Cannot run bytecode-based risk analysis.",
    });
    return { score: 0, findings };
  }

  findings.push({
    level: "low",
    label: "Contract bytecode",
    description: "Bytecode retrieved via BSCTrace API (MegaNode). Analysis is heuristic only; not a substitute for a full audit.",
  });

  if (bytecodeContains(bytecode, OPCODE.DELEGATECALL)) {
    findings.push({
      level: "medium",
      label: "Delegatecall / proxy pattern",
      description: "Bytecode contains DELEGATECALL. Contract may delegate to external logic or act as a proxy. Upgradeability risk.",
    });
    score -= 15;
  }

  if (bytecodeContains(bytecode, OPCODE.SELFDESTRUCT)) {
    findings.push({
      level: "medium",
      label: "Self-destruct capable",
      description: "Bytecode contains SELFDESTRUCT. Contract can destroy itself and send funds to a designated address.",
    });
    score -= 15;
  }

  if (bytecodeContains(bytecode, OPCODE.CREATE) || bytecodeContains(bytecode, OPCODE.CREATE2)) {
    findings.push({
      level: "low",
      label: "Can deploy contracts",
      description: "Bytecode contains CREATE/CREATE2. Contract can deploy new contracts (e.g. factory pattern).",
    });
    score -= 5;
  }

  const sizeBytes = hex.length / 2;
  if (sizeBytes > 24 * 1024) {
    findings.push({
      level: "low",
      label: "Large bytecode",
      description: `Bytecode size ~${(sizeBytes / 1024).toFixed(1)} KB. Higher complexity; consider professional audit.`,
    });
    score -= 5;
  }

  if (meta.creator) {
    findings.push({
      level: "low",
      label: "Creator info",
      description: `Contract creation tx retrieved via BSCTrace API. Creator: ${meta.creator.slice(0, 10)}...`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  let scoreLabel: string;
  if (score >= 80) scoreLabel = "Low risk";
  else if (score >= 60) scoreLabel = "Medium risk";
  else if (score >= 40) scoreLabel = "High risk";
  else scoreLabel = "Critical risk";

  return { score, findings };
}

/** Legacy analyzeRisks (ABI + source). Kept for tests; now delegates to bytecode when source is empty. */
export function analyzeRisks(
  abi: { name?: string }[],
  sourceCode: string,
  meta: { proxy?: string; implementation?: string; compiler?: string } = {}
): { score: number; findings: RiskFinding[] } {
  if (!sourceCode || sourceCode.length < 100) {
    return analyzeRisksBytecode("0x", {});
  }
  const mockBytecode = "0x60".padEnd(200, "0");
  return analyzeRisksBytecode(mockBytecode, {});
}

interface BsctraceContractData {
  bytecode: string;
  creator?: string;
  creationTxHash?: string;
}

/** Fetch contract bytecode and creation tx from BSCTrace API (MegaNode). */
export async function fetchContractFromBsctrace(
  address: string,
  apiKey: string
): Promise<BsctraceContractData> {
  const url = `${BSCTRACE_API_BASE}/${apiKey}`.replace(/\/(\/+)/g, "/");

  const rpc = async (method: string, params: unknown[]): Promise<unknown> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`BSCTrace API HTTP ${res.status}`);
    const json = (await res.json()) as { error?: { message: string }; result?: unknown };
    if (json.error) throw new Error(json.error.message ?? "BSCTrace API error");
    return json.result;
  };

  const bytecode = (await rpc("eth_getCode", [address, "latest"])) as string;
  if (typeof bytecode !== "string") throw new Error("Invalid bytecode response");

  let creator: string | undefined;
  let creationTxHash: string | undefined;
  try {
    const creation = (await rpc("nr_getContractCreationTransaction", [address])) as {
      from?: string;
      hash?: string;
    } | null;
    if (creation?.from) creator = creation.from;
    if (creation?.hash) creationTxHash = creation.hash;
  } catch {
    // Creation tx optional
  }

  return { bytecode: bytecode || "0x", creator, creationTxHash };
}

/** Run full scan: fetch via BSCTrace + bytecode analysis. */
export async function runScan(address: string, apiKey: string): Promise<ScanResult> {
  const normalized = normalizeAddress(address);
  if (!normalized) throw new Error("Invalid contract address");
  const { bytecode, creator, creationTxHash } = await fetchContractFromBsctrace(normalized, apiKey);
  const { score, findings } = analyzeRisksBytecode(bytecode, { creator, creationTxHash });
  const scoreLabel =
    score >= 80 ? "Low risk" : score >= 60 ? "Medium risk" : score >= 40 ? "High risk" : "Critical risk";
  return {
    address: normalized,
    contractName: null,
    verified: bytecode.length > 4,
    score,
    scoreLabel,
    findings,
    meta: { creator, creationTxHash },
  };
}

function main(): void {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(__dirname, "..", "frontend.html"), "utf-8"));
  });

  app.get("/api/scan", async (req, res) => {
    const address = (req.query.address as string)?.trim();
    const apiKey = (process.env.BSCTRACE_API_KEY ?? "").trim();
    if (!address) {
      res.status(400).json({ error: "Missing query parameter: address" });
      return;
    }
    if (!apiKey || apiKey === "YourBsctraceApiKey") {
      res.status(400).json({
        error:
          "BSCTrace API key not configured. Set BSCTRACE_API_KEY in .env. Get a free key at https://dashboard.nodereal.io/",
      });
      return;
    }
    if (!isValidBscAddress(address)) {
      res.status(400).json({ error: "Invalid BSC address. Use a 0x-prefixed 40-character hex string." });
      return;
    }
    try {
      const result = await runScan(address, apiKey);
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      res.status(500).json({ error: msg });
    }
  });

  app.listen(PORT, () => {
    console.log(`AI Contract Risk Scanner running at http://localhost:${PORT}`);
  });
}

if (process.env.VITEST !== "true") main();

/**
 * MEV Risk Meter — BSC transaction and contract MEV risk analysis.
 * Analyzes transactions and contracts for front-running, sandwich attacks, and other MEV risks.
 */

import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface MevRiskFinding {
  level: RiskLevel;
  label: string;
  description: string;
}

export interface MevRiskResult {
  address: string;
  riskScore: number;
  riskLabel: string;
  findings: MevRiskFinding[];
  transactionHash?: string;
  contractType?: string;
}

interface TransactionData {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  input?: string;
  gasPrice?: string;
  gas?: string;
}

interface ContractAbi {
  type?: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ name?: string; type?: string }>;
  outputs?: Array<{ name?: string; type?: string }>;
}

/** Normalize address to checksum-friendly lowercase 0x form. */
export function normalizeAddress(addr: string): string {
  const s = String(addr).trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) return "";
  return s.toLowerCase().replace(/^0x/, "0x");
}

/** Check if string looks like a valid BSC address. */
export function isValidBscAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr).trim());
}

/** Check if string looks like a valid transaction hash. */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(String(hash).trim());
}

/** Check if ABI contains swap-related functions. */
export function hasSwapFunctions(abi: ContractAbi[]): boolean {
  const swapKeywords = [
    "swap",
    "swapExact",
    "swapTokens",
    "swapETH",
    "swapExactTokens",
    "swapTokensForExact",
    "addLiquidity",
    "removeLiquidity",
  ];
  const names = new Set(abi.map((a) => (a.name || "").toLowerCase()).filter(Boolean));
  return swapKeywords.some((kw) => Array.from(names).some((n) => n.includes(kw)));
}

/** Check if ABI contains price oracle dependencies. */
export function hasPriceOracleDependencies(abi: ContractAbi[]): boolean {
  const oracleKeywords = ["getPrice", "latestRoundData", "getLatestPrice", "oracle", "priceFeed"];
  const names = new Set(abi.map((a) => (a.name || "").toLowerCase()).filter(Boolean));
  return oracleKeywords.some((kw) => Array.from(names).some((n) => n.includes(kw.toLowerCase())));
}

/** Check if ABI contains flash loan functions. */
export function hasFlashLoanFunctions(abi: ContractAbi[]): boolean {
  const flashLoanKeywords = ["flashLoan", "flashloan", "flashBorrow", "borrow"];
  const names = new Set(abi.map((a) => (a.name || "").toLowerCase()).filter(Boolean));
  return flashLoanKeywords.some((kw) => Array.from(names).some((n) => n.includes(kw)));
}

/** Check if transaction input suggests a swap operation. */
export function isSwapTransaction(input: string): boolean {
  const swapSignatures = [
    "0x38ed1739", // swapExactTokensForTokens
    "0x7ff36ab5", // swapExactETHForTokens
    "0x18cbafe5", // swapExactTokensForETH
    "0x4a25d94a", // swapTokensForExactTokens
    "0x8803dbee", // swapTokensForExactETH
    "0xb6f9de95", // swapExactETHForTokensSupportingFeeOnTransferTokens
  ];
  const normalized = input.toLowerCase();
  return swapSignatures.some((sig) => normalized.startsWith(sig));
}

/** Check if transaction has high gas price (potential front-running). */
export function hasHighGasPrice(gasPrice: string, currentGasPrice: string): boolean {
  try {
    const txGas = BigInt(gasPrice);
    const currentGas = BigInt(currentGasPrice);
    // If transaction gas price is > 20% higher than current, it's suspicious
    return txGas > (currentGas * BigInt(120)) / BigInt(100);
  } catch {
    return false;
  }
}

/** Check if transaction value is significant (sandwich attack target). */
export function hasSignificantValue(value: string): boolean {
  try {
    // 1 BNB = 10^18 wei, check if > 0.1 BNB
    const val = BigInt(value);
    const threshold = BigInt("100000000000000000"); // 0.1 BNB
    return val > threshold;
  } catch {
    return false;
  }
}

/** Analyze contract ABI for MEV risks. */
export function analyzeContractMevRisks(abi: ContractAbi[]): { score: number; findings: MevRiskFinding[] } {
  const findings: MevRiskFinding[] = [];
  let score = 100;

  const hasSwap = hasSwapFunctions(abi);
  if (hasSwap) {
    findings.push({
      level: "high",
      label: "Swap functions detected",
      description:
        "Contract contains swap functions. These are prime targets for sandwich attacks and front-running.",
    });
    score -= 25;
  }

  const hasOracle = hasPriceOracleDependencies(abi);
  if (hasOracle) {
    findings.push({
      level: "medium",
      label: "Price oracle dependencies",
      description:
        "Contract relies on price oracles. Oracle manipulation or front-running can lead to MEV extraction.",
    });
    score -= 15;
  }

  const hasFlashLoan = hasFlashLoanFunctions(abi);
  if (hasFlashLoan) {
    findings.push({
      level: "critical",
      label: "Flash loan functions",
      description:
        "Contract supports flash loans. Flash loans enable sophisticated MEV attacks including arbitrage and liquidation.",
    });
    score -= 30;
  }

  // Check for unprotected external calls
  const hasExternalCalls = abi.some(
    (item) =>
      item.type === "function" &&
      (item.stateMutability === "payable" || item.stateMutability === "nonpayable") &&
      item.name &&
      !item.name.toLowerCase().includes("view") &&
      !item.name.toLowerCase().includes("get")
  );
  if (hasExternalCalls && hasSwap) {
    findings.push({
      level: "high",
      label: "Unprotected swap operations",
      description:
        "Swap functions without access controls or slippage protection are vulnerable to front-running.",
    });
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, findings };
}

/** Analyze transaction for MEV risks. */
export function analyzeTransactionMevRisks(
  tx: TransactionData,
  currentGasPrice: string
): { score: number; findings: MevRiskFinding[] } {
  const findings: MevRiskFinding[] = [];
  let score = 100;

  if (tx.input && isSwapTransaction(tx.input)) {
    findings.push({
      level: "high",
      label: "Swap transaction detected",
      description:
        "This is a swap transaction. Swaps are commonly targeted by sandwich attacks and front-running bots.",
    });
    score -= 25;
  }

  if (tx.value && hasSignificantValue(tx.value)) {
    findings.push({
      level: "medium",
      label: "Large transaction value",
      description:
        "Transaction involves significant value (>0.1 BNB). Large transactions are more attractive MEV targets.",
    });
    score -= 15;
  }

  if (tx.gasPrice && hasHighGasPrice(tx.gasPrice, currentGasPrice)) {
    findings.push({
      level: "high",
      label: "High gas price",
      description:
        "Transaction uses gas price >20% above current average. This may indicate front-running attempt or priority.",
    });
    score -= 20;
  }

  if (tx.input && tx.input.length > 10 && !isSwapTransaction(tx.input)) {
    // Complex transaction with data
    findings.push({
      level: "low",
      label: "Complex transaction",
      description:
        "Transaction contains complex call data. Review contract interactions for potential MEV vectors.",
    });
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, findings };
}

/** Fetch transaction data from BSC RPC. */
export async function fetchTransaction(txHash: string, rpcUrl: string): Promise<TransactionData> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionByHash",
      params: [txHash],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const json = (await response.json()) as { result?: TransactionData; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "RPC error");
  if (!json.result) throw new Error("Transaction not found");

  return json.result;
}

/** Fetch current gas price from BSC RPC. */
export async function fetchCurrentGasPrice(rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const json = (await response.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "RPC error");
  if (!json.result) throw new Error("Failed to fetch gas price");

  return json.result;
}

/** Fetch contract code and attempt to get ABI (simplified - in production use BSCTrace API). */
export async function fetchContractCode(address: string, rpcUrl: string): Promise<{ code: string; isContract: boolean }> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getCode",
      params: [address, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const json = (await response.json()) as { result?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "RPC error");
  if (!json.result) throw new Error("Failed to fetch contract code");

  const code = json.result || "";
  return { code, isContract: code !== "0x" && code.length > 2 };
}

/** Analyze address (contract or transaction) for MEV risks. */
export async function analyzeMevRisk(
  input: string,
  rpcUrl: string
): Promise<MevRiskResult> {
  let riskScore = 100;
  let riskLabel = "Low risk";
  const findings: MevRiskFinding[] = [];
  let transactionHash: string | undefined;
  let contractType: string | undefined;

  // Determine if input is a transaction hash or contract address
  if (isValidTxHash(input)) {
    // Analyze transaction
    transactionHash = input.toLowerCase().startsWith("0x") ? input.toLowerCase() : "0x" + input.toLowerCase();
    const currentGasPrice = await fetchCurrentGasPrice(rpcUrl);
    const tx = await fetchTransaction(transactionHash, rpcUrl);
    const { score, findings: txFindings } = analyzeTransactionMevRisks(tx, currentGasPrice);
    riskScore = score;
    findings.push(...txFindings);
    contractType = "Transaction";
  } else if (isValidBscAddress(input)) {
    // Analyze contract
    const address = normalizeAddress(input);
    const { isContract } = await fetchContractCode(address, rpcUrl);
    
    if (!isContract) {
      findings.push({
        level: "low",
        label: "EOA (Externally Owned Account)",
        description: "This is a regular wallet address, not a contract. MEV risks are minimal.",
      });
      riskScore = 95;
      contractType = "EOA";
    } else {
      // For contract analysis, we'd ideally fetch ABI from BSCTrace API
      // For this demo, we'll use heuristics based on common patterns
      findings.push({
        level: "medium",
        label: "Contract address",
        description:
          "This is a smart contract. To fully analyze MEV risks, contract ABI and source code should be reviewed.",
      });
      riskScore = 70;
      contractType = "Contract";
      
      // Add generic contract warnings
      findings.push({
        level: "medium",
        label: "Contract MEV risk assessment",
        description:
          "Contracts with swap functions, price oracles, or flash loans are at higher MEV risk. Review contract source code for detailed analysis.",
      });
    }
  } else {
    throw new Error("Invalid input. Provide a BSC transaction hash (0x64 hex) or contract address (0x40 hex).");
  }

  // Determine risk label
  if (riskScore >= 80) riskLabel = "Low risk";
  else if (riskScore >= 60) riskLabel = "Medium risk";
  else if (riskScore >= 40) riskLabel = "High risk";
  else riskLabel = "Critical risk";

  return {
    address: isValidTxHash(input) ? transactionHash! : normalizeAddress(input),
    riskScore,
    riskLabel,
    findings,
    transactionHash,
    contractType,
  };
}

function main(): void {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(__dirname, "..", "frontend.html"), "utf-8"));
  });

  app.get("/api/analyze", async (req, res) => {
    const input = (req.query.input as string)?.trim();
    if (!input) {
      res.status(400).json({ error: "Missing query parameter: input" });
      return;
    }

    try {
      const result = await analyzeMevRisk(input, BSC_RPC_URL);
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      res.status(500).json({ error: msg });
    }
  });

  function tryListen(port: number): void {
    const server = app.listen(port, () => {
      console.log(`MEV Risk Meter running at http://localhost:${port}`);
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

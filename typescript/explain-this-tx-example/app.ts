/**
 * Transaction Explanation Tool — core logic for BNB Smart Chain (BSC).
 * Fetches and explains what any BSC transaction does.
 */

import { JsonRpcProvider, formatEther, formatUnits, isAddress, parseTransaction } from "ethers";

/** BSC mainnet chain ID. */
export const BSC_CHAIN_ID = 56;

/** Transaction explanation result. */
export interface TxExplanation {
  hash: string;
  blockNumber: number | null;
  from: string;
  to: string | null;
  value: string; // in BNB
  gasUsed: bigint | null;
  gasPrice: string; // in Gwei
  status: "success" | "failed" | "pending" | "unknown";
  isContractCreation: boolean;
  isContractCall: boolean;
  functionName: string | null;
  functionArgs: Record<string, unknown> | null;
  explanation: string;
  rawData: string;
}

/**
 * Fetches a transaction by hash from BSC.
 */
export async function fetchTransaction(
  txHash: string,
  rpcUrl: string
): Promise<TxExplanation> {
  if (!txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error("Invalid transaction hash format");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  
  // Fetch transaction receipt and transaction data
  const [receipt, tx] = await Promise.all([
    provider.getTransactionReceipt(txHash).catch(() => null),
    provider.getTransaction(txHash),
  ]);

  if (!tx) {
    throw new Error("Transaction not found");
  }

  const value = formatEther(tx.value);
  const gasPrice = receipt?.gasPrice 
    ? formatUnits(receipt.gasPrice, "gwei") 
    : tx.gasPrice 
    ? formatUnits(tx.gasPrice, "gwei")
    : "0";

  const isContractCreation = !tx.to;
  const isContractCall = tx.to && tx.data && tx.data !== "0x" && tx.data.length > 2;
  
  let functionName: string | null = null;
  let functionArgs: Record<string, unknown> | null = null;
  let explanation = "";

  // Parse contract call
  if (isContractCall && tx.data) {
    const decoded = decodeFunctionCall(tx.data);
    functionName = decoded.name;
    functionArgs = decoded.args;
  }

  // Build explanation
  if (isContractCreation) {
    explanation = `This transaction creates a new smart contract on BSC.`;
    if (value !== "0.0") {
      explanation += ` It also sends ${value} BNB to the contract constructor.`;
    }
  } else if (isContractCall && functionName) {
    explanation = `This transaction calls the function "${functionName}" on the contract at ${tx.to}.`;
    if (functionArgs && Object.keys(functionArgs).length > 0) {
      explanation += ` Parameters: ${formatArgs(functionArgs)}.`;
    }
    if (value !== "0.0") {
      explanation += ` It also sends ${value} BNB along with the call.`;
    }
  } else if (isContractCall) {
    explanation = `This transaction calls an unknown function on the contract at ${tx.to}.`;
    if (value !== "0.0") {
      explanation += ` It sends ${value} BNB along with the call.`;
    }
  } else if (value !== "0.0") {
    explanation = `This is a simple BNB transfer of ${value} BNB from ${tx.from} to ${tx.to}.`;
  } else {
    explanation = `This transaction sends 0 BNB from ${tx.from} to ${tx.to}. It may be a failed transaction or a data-only transaction.`;
  }

  // Add status info
  if (receipt) {
    if (receipt.status === 1) {
      explanation += ` The transaction succeeded.`;
    } else if (receipt.status === 0) {
      explanation += ` The transaction failed (reverted).`;
    }
    if (receipt.gasUsed) {
      explanation += ` Gas used: ${receipt.gasUsed.toString()}.`;
    }
  } else {
    explanation += ` Transaction status is pending or unknown.`;
  }

  return {
    hash: txHash,
    blockNumber: receipt?.blockNumber ?? null,
    from: tx.from,
    to: tx.to ?? null,
    value,
    gasUsed: receipt?.gasUsed ?? null,
    gasPrice,
    status: receipt
      ? receipt.status === 1
        ? "success"
        : receipt.status === 0
        ? "failed"
        : "unknown"
      : "pending",
    isContractCreation,
    isContractCall,
    functionName,
    functionArgs,
    explanation,
    rawData: tx.data || "0x",
  };
}

/**
 * Attempts to decode a function call from transaction data.
 * Returns function name and arguments if decodable, otherwise null.
 */
function decodeFunctionCall(data: string): { name: string; args: Record<string, unknown> } {
  // Extract function selector (first 4 bytes)
  if (data.length < 10) {
    return { name: "unknown", args: {} };
  }

  const selector = data.slice(0, 10);
  
  // Common function selectors (first 4 bytes of keccak256 hash of function signature)
  const commonSelectors: Record<string, string> = {
    "0xa9059cbb": "transfer(address,uint256)",
    "0x23b872dd": "transferFrom(address,address,uint256)",
    "0x095ea7b3": "approve(address,uint256)",
    "0x40c10f19": "mint(address,uint256)",
    "0x42966c68": "burn(uint256)",
    "0x70a08231": "balanceOf(address)",
    "0x18160ddd": "totalSupply()",
    "0x06fdde03": "name()",
    "0x95d89b41": "symbol()",
    "0x313ce567": "decimals()",
    "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
    "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
    "0x02751cec": "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",
    "0xbaa2abde": "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)",
  };

  const functionSig = commonSelectors[selector.toLowerCase()];
  if (functionSig) {
    return {
      name: functionSig.split("(")[0],
      args: parseCommonFunctionArgs(selector, data),
    };
  }

  return { name: `0x${selector.slice(2)}`, args: {} };
}

/**
 * Parses common function arguments from transaction data.
 */
function parseCommonFunctionArgs(selector: string, data: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  
  // Remove selector and parse remaining data
  const params = data.slice(10);
  if (params.length === 0) return args;

  // Each parameter is 64 hex chars (32 bytes)
  const paramSize = 64;
  const paramsList: string[] = [];
  
  for (let i = 0; i < params.length; i += paramSize) {
    paramsList.push("0x" + params.slice(i, i + paramSize));
  }

  switch (selector.toLowerCase()) {
    case "0xa9059cbb": // transfer(address,uint256)
      if (paramsList.length >= 2) {
        args.to = paramsList[0];
        args.amount = paramsList[1];
      }
      break;
    case "0x23b872dd": // transferFrom(address,address,uint256)
      if (paramsList.length >= 3) {
        args.from = paramsList[0];
        args.to = paramsList[1];
        args.amount = paramsList[2];
      }
      break;
    case "0x095ea7b3": // approve(address,uint256)
      if (paramsList.length >= 2) {
        args.spender = paramsList[0];
        args.amount = paramsList[1];
      }
      break;
    case "0x40c10f19": // mint(address,uint256)
      if (paramsList.length >= 2) {
        args.to = paramsList[0];
        args.amount = paramsList[1];
      }
      break;
    case "0x42966c68": // burn(uint256)
      if (paramsList.length >= 1) {
        args.amount = paramsList[0];
      }
      break;
  }

  return args;
}

/**
 * Formats function arguments for display.
 */
function formatArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.startsWith("0x")) {
      // Try to format as address
      if (value.length === 66) {
        parts.push(`${key}: ${value.slice(0, 10)}...${value.slice(-8)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    } else {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join(", ");
}

/**
 * Validates a transaction hash format.
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Gets a BSC explorer URL for a transaction (BSCTrace API / explorer).
 */
export function getExplorerUrl(txHash: string, chainId: number = BSC_CHAIN_ID): string {
  if (chainId === 56) {
    return `https://bsctrace.com/tx/${txHash}`;
  } else if (chainId === 97) {
    return `https://testnet.bsctrace.com/tx/${txHash}`;
  }
  return `https://bsctrace.com/tx/${txHash}`;
}

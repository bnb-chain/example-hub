/**
 * Multicall Batcher — core logic for BNB Smart Chain (BSC).
 * Batches multiple contract calls into a single RPC call using multicall contracts.
 */

import { Contract, Interface, AbiCoder, type ContractRunner } from "ethers";

/** BSC mainnet chain ID (BNB Smart Chain). */
export const BSC_CHAIN_ID = 56;

/**
 * Popular multicall contract on BSC mainnet.
 * This is the Multicall3 contract deployed at a well-known address.
 */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

/**
 * Multicall3 ABI - minimal interface for aggregate calls.
 */
export const MULTICALL3_ABI = [
  "function aggregate((address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)",
  "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)",
  "function aggregate3Value((address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)",
  "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)",
  "function tryBlockAndAggregate(bool requireSuccess, (address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, ((bool success, bytes returnData)[] returnData))",
] as const;

/**
 * Represents a single contract call to be batched.
 */
export interface CallRequest {
  target: string;
  callData: string;
  allowFailure?: boolean;
}

/**
 * Result of a single call within a multicall batch.
 */
export interface CallResult {
  success: boolean;
  returnData: string;
}

/**
 * Full result of a multicall batch execution.
 */
export interface MulticallResult {
  blockNumber: bigint;
  results: CallResult[];
}

/**
 * Creates encoded call data for a contract function call.
 */
export function encodeCall(
  contractAddress: string,
  abi: readonly unknown[],
  functionName: string,
  args: unknown[] = []
): CallRequest {
  const iface = new Interface(abi);
  const callData = iface.encodeFunctionData(functionName, args);
  return {
    target: contractAddress,
    callData,
  };
}

/**
 * Decodes the return data from a contract call.
 */
export function decodeCall(
  abi: readonly unknown[],
  functionName: string,
  returnData: string
): unknown {
  const iface = new Interface(abi);
  try {
    return iface.decodeFunctionResult(functionName, returnData);
  } catch (error) {
    throw new Error(`Failed to decode result: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Executes a batch of contract calls using Multicall3.
 * Uses aggregate3 which allows individual call failures.
 */
export async function executeMulticall(
  runner: ContractRunner,
  calls: CallRequest[]
): Promise<MulticallResult> {
  if (calls.length === 0) {
    throw new Error("No calls to execute");
  }

  const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, runner);

  // Prepare calls with allowFailure flag
  const multicallCalls = calls.map((call) => ({
    target: call.target,
    allowFailure: call.allowFailure ?? true,
    callData: call.callData,
  }));

  try {
    const result = await multicall.aggregate3.staticCall(multicallCalls);
    const blockNumber = await runner.provider?.getBlockNumber() ?? 0n;

    return {
      blockNumber: BigInt(blockNumber),
      results: result.map((r: { success: boolean; returnData: string }) => ({
        success: r.success,
        returnData: r.returnData,
      })),
    };
  } catch (error) {
    throw new Error(
      `Multicall execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Executes multiple contract calls individually (non-batched).
 * Useful for comparing gas usage and performance.
 */
export async function executeIndividualCalls(
  runner: ContractRunner,
  calls: CallRequest[]
): Promise<CallResult[]> {
  const results: CallResult[] = [];

  for (const call of calls) {
    try {
      const result = await runner.call({
        to: call.target,
        data: call.callData,
      });
      results.push({
        success: true,
        returnData: result,
      });
    } catch (error) {
      results.push({
        success: false,
        returnData: "0x",
      });
    }
  }

  return results;
}

/**
 * Example ERC20 token ABI for common functions.
 */
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

/**
 * Creates example calls for a BSC token (e.g., BUSD, USDT).
 * Returns calls for name, symbol, decimals, totalSupply, and balanceOf.
 */
export function createExampleTokenCalls(
  tokenAddress: string,
  balanceOfAddress?: string
): CallRequest[] {
  const calls: CallRequest[] = [
    encodeCall(tokenAddress, ERC20_ABI, "name", []),
    encodeCall(tokenAddress, ERC20_ABI, "symbol", []),
    encodeCall(tokenAddress, ERC20_ABI, "decimals", []),
    encodeCall(tokenAddress, ERC20_ABI, "totalSupply", []),
  ];

  if (balanceOfAddress) {
    calls.push(encodeCall(tokenAddress, ERC20_ABI, "balanceOf", [balanceOfAddress]));
  }

  return calls;
}

/**
 * Popular BSC token addresses for examples.
 */
export const BSC_TOKENS = {
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
} as const;

/**
 * Estimates gas savings by comparing multicall vs individual calls.
 * Returns estimated gas saved (in wei).
 */
export function estimateGasSavings(numCalls: number): bigint {
  // Rough estimates:
  // - Individual call overhead: ~21,000 gas per call
  // - Multicall overhead: ~50,000 gas base + ~5,000 per call
  const individualGas = BigInt(numCalls) * 21000n;
  const multicallGas = 50000n + BigInt(numCalls) * 5000n;
  const savings = individualGas > multicallGas ? individualGas - multicallGas : 0n;
  return savings;
}

/**
 * Mini Subgraph Event Listener — core logic for BNB Smart Chain (BSC).
 * Listens to and queries blockchain events from smart contracts.
 */

import { JsonRpcProvider, Contract, EventLog, Log } from "ethers";

/** BSC mainnet RPC URL. */
export const DEFAULT_BSC_RPC = "https://bsc-dataseed.bnbchain.org";

/** Event data structure for display. */
export interface EventData {
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  address: string;
  eventName: string;
  args: Record<string, unknown>;
  topics: string[];
  data: string;
  timestamp?: number;
}

/**
 * Creates a provider for BSC mainnet.
 */
export function createBscProvider(rpcUrl?: string): JsonRpcProvider {
  return new JsonRpcProvider(rpcUrl || DEFAULT_BSC_RPC);
}

/**
 * Parses an event log into a structured EventData object.
 */
export function parseEventLog(
  log: EventLog | Log,
  eventName?: string
): EventData {
  const eventLog = log as EventLog;
  return {
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
    transactionHash: log.transactionHash,
    address: log.address,
    eventName: eventName || "Unknown",
    args: eventLog.args ? Object.fromEntries(
      Object.entries(eventLog.args).filter(([k]) => !/^\d+$/.test(k))
    ) : {},
    topics: log.topics,
    data: log.data,
  };
}

/**
 * Queries past events from a contract.
 */
export async function queryPastEvents(
  provider: JsonRpcProvider,
  contractAddress: string,
  eventSignature: string,
  fromBlock: number,
  toBlock: number | "latest"
): Promise<EventData[]> {
  try {
    // Validate address first
    if (!isValidAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }

    // Validate event signature format
    if (!isValidEventSignature(eventSignature)) {
      throw new Error("Invalid event signature format");
    }

    let contract: Contract;
    try {
      contract = new Contract(contractAddress, [eventSignature], provider);
    } catch (error) {
      throw new Error(
        `Failed to create contract interface: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const eventName = eventSignature.match(/event\s+(\w+)/)?.[1] || "Unknown";
    
    const toBlockNum = toBlock === "latest" ? await provider.getBlockNumber() : toBlock;
    
    let filter;
    try {
      filter = contract.filters[eventName]();
    } catch (error) {
      throw new Error(
        `Failed to create event filter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    
    const logs = await provider.getLogs({
      address: contractAddress,
      topics: filter.topics,
      fromBlock,
      toBlock: toBlockNum,
    });

    const events: EventData[] = [];
    for (const log of logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed) {
          events.push(parseEventLog(log as EventLog, parsed.name));
        } else {
          events.push(parseEventLog(log));
        }
      } catch {
        events.push(parseEventLog(log));
      }
    }

    return events;
  } catch (error) {
    throw new Error(
      `Failed to query events: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sets up a real-time event listener for a contract.
 */
export function setupEventListener(
  provider: JsonRpcProvider,
  contractAddress: string,
  eventSignature: string,
  onEvent: (event: EventData) => void
): () => void {
  try {
    const contract = new Contract(contractAddress, [eventSignature], provider);
    const eventName = eventSignature.match(/event\s+(\w+)/)?.[1] || "Unknown";
    
    const filter = contract.filters[eventName]();
    
    const listener = async (log: Log) => {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed) {
          onEvent(parseEventLog(log as EventLog, parsed.name));
        } else {
          onEvent(parseEventLog(log));
        }
      } catch {
        onEvent(parseEventLog(log));
      }
    };

    provider.on(filter, listener);

    // Return cleanup function
    return () => {
      provider.off(filter, listener);
    };
  } catch (error) {
    throw new Error(
      `Failed to setup listener: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gets the current block number.
 */
export async function getCurrentBlockNumber(
  provider: JsonRpcProvider
): Promise<number> {
  return await provider.getBlockNumber();
}

/**
 * Gets block timestamp.
 */
export async function getBlockTimestamp(
  provider: JsonRpcProvider,
  blockNumber: number
): Promise<number> {
  const block = await provider.getBlock(blockNumber);
  return block?.timestamp || 0;
}

/**
 * Validates an Ethereum address.
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates an event signature format.
 */
export function isValidEventSignature(signature: string): boolean {
  return /^event\s+\w+\([^)]*\)/.test(signature.trim());
}

/**
 * Gets a sample event signature for common ERC20 events.
 */
export function getSampleEventSignatures(): Record<string, string> {
  return {
    Transfer: "event Transfer(address indexed from, address indexed to, uint256 value)",
    Approval: "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "PancakeSwap Pair Created": "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
  };
}

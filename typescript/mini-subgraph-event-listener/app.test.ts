import { describe, it, expect } from "vitest";
import {
  createBscProvider,
  parseEventLog,
  isValidAddress,
  isValidEventSignature,
  getSampleEventSignatures,
  getCurrentBlockNumber,
  queryPastEvents,
} from "./app.js";
import { JsonRpcProvider, Log } from "ethers";

describe("createBscProvider", () => {
  it("creates a provider with default BSC RPC", () => {
    const provider = createBscProvider();
    expect(provider).toBeInstanceOf(JsonRpcProvider);
  });

  it("creates a provider with custom RPC URL", () => {
    const customUrl = "https://bsc-dataseed1.bnbchain.org";
    const provider = createBscProvider(customUrl);
    expect(provider).toBeInstanceOf(JsonRpcProvider);
  });
});

describe("isValidAddress", () => {
  it("returns true for valid Ethereum address", () => {
    expect(isValidAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")).toBe(true);
    expect(isValidAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("returns false for invalid addresses", () => {
    expect(isValidAddress("")).toBe(false);
    expect(isValidAddress("0x123")).toBe(false);
    expect(isValidAddress("bb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")).toBe(false);
    expect(isValidAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c123")).toBe(false);
  });
});

describe("isValidEventSignature", () => {
  it("returns true for valid event signatures", () => {
    expect(isValidEventSignature("event Transfer(address indexed from, address indexed to, uint256 value)")).toBe(true);
    expect(isValidEventSignature("event Approval(address indexed owner, address indexed spender, uint256 value)")).toBe(true);
    expect(isValidEventSignature("event PairCreated(address indexed token0, address indexed token1, address pair, uint256)")).toBe(true);
  });

  it("returns false for invalid event signatures", () => {
    expect(isValidEventSignature("")).toBe(false);
    expect(isValidEventSignature("Transfer(address, address, uint256)")).toBe(false);
    expect(isValidEventSignature("function transfer()")).toBe(false);
    expect(isValidEventSignature("event")).toBe(false);
  });
});

describe("getSampleEventSignatures", () => {
  it("returns sample event signatures", () => {
    const samples = getSampleEventSignatures();
    expect(samples).toBeDefined();
    expect(samples.Transfer).toContain("event Transfer");
    expect(samples.Approval).toContain("event Approval");
    expect(samples["PancakeSwap Pair Created"]).toContain("event PairCreated");
  });

  it("all returned signatures are valid", () => {
    const samples = getSampleEventSignatures();
    for (const sig of Object.values(samples)) {
      expect(isValidEventSignature(sig)).toBe(true);
    }
  });
});

describe("parseEventLog", () => {
  it("parses a log into EventData structure", () => {
    const mockLog: Log = {
      blockNumber: 12345,
      blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      topics: ["0x1234"],
      data: "0x5678",
      index: 0,
      removed: false,
    };

    const eventData = parseEventLog(mockLog, "Transfer");
    expect(eventData.blockNumber).toBe(12345);
    expect(eventData.blockHash).toBe(mockLog.blockHash);
    expect(eventData.transactionHash).toBe(mockLog.transactionHash);
    expect(eventData.address).toBe(mockLog.address);
    expect(eventData.eventName).toBe("Transfer");
    expect(eventData.topics).toEqual(mockLog.topics);
    expect(eventData.data).toBe(mockLog.data);
  });

  it("handles logs without event name", () => {
    const mockLog: Log = {
      blockNumber: 12345,
      blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      topics: ["0x1234"],
      data: "0x5678",
      index: 0,
      removed: false,
    };

    const eventData = parseEventLog(mockLog);
    expect(eventData.eventName).toBe("Unknown");
  });
});

describe("getCurrentBlockNumber", () => {
  it("returns a valid block number", async () => {
    const provider = createBscProvider();
    const blockNumber = await getCurrentBlockNumber(provider);
    expect(typeof blockNumber).toBe("number");
    expect(blockNumber).toBeGreaterThan(0);
  }, 10000);
});

describe("queryPastEvents", () => {
  it("handles invalid contract address gracefully", async () => {
    const provider = createBscProvider();
    await expect(
      queryPastEvents(
        provider,
        "0xinvalid",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        0,
        100
      )
    ).rejects.toThrow();
  }, 10000);

  it("handles invalid event signature gracefully", async () => {
    const provider = createBscProvider();
    await expect(
      queryPastEvents(
        provider,
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "invalid signature",
        0,
        100
      )
    ).rejects.toThrow("Invalid event signature format");
  }, 10000);
});

// Note: Real event querying tests would require:
// - A known contract with known events
// - Specific block ranges where events exist
// - More complex mocking or integration test setup
// For a mini demo, the above tests cover the core validation and parsing logic.

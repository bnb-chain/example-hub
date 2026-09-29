import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidTxHash,
  getExplorerUrl,
  BSC_CHAIN_ID,
} from "./app.js";

describe("isValidTxHash", () => {
  it("accepts valid transaction hash", () => {
    expect(isValidTxHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(true);
    expect(isValidTxHash("0x0000000000000000000000000000000000000000000000000000000000000000")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidTxHash("")).toBe(false);
    expect(isValidTxHash("0x")).toBe(false);
    expect(isValidTxHash("0x123")).toBe(false);
    expect(isValidTxHash("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(false);
    expect(isValidTxHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde")).toBe(false);
    expect(isValidTxHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg")).toBe(false);
  });
});

describe("getExplorerUrl", () => {
  it("returns BSC mainnet explorer URL for chain ID 56", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const url = getExplorerUrl(hash, 56);
    expect(url).toBe(`https://bsctrace.com/tx/${hash}`);
  });

  it("returns testnet explorer URL for chain ID 97", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const url = getExplorerUrl(hash, 97);
    expect(url).toBe(`https://testnet.bsctrace.com/tx/${hash}`);
  });

  it("defaults to mainnet if chain ID not specified", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const url = getExplorerUrl(hash);
    expect(url).toBe(`https://bsctrace.com/tx/${hash}`);
  });
});

describe("BSC_CHAIN_ID", () => {
  it("is 56 for BNB Smart Chain mainnet", () => {
    expect(BSC_CHAIN_ID).toBe(56);
  });
});

// Note: fetchTransaction tests would require mocking the RPC provider
// For a complete test suite, you would mock JsonRpcProvider and test:
// - Successful transaction fetch
// - Contract creation detection
// - Contract call decoding
// - Function argument parsing
// - Error handling for invalid hashes
// - Error handling for non-existent transactions

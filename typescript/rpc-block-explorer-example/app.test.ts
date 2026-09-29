import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hexToNumber,
  hexToBigInt,
  weiToBnb,
  weiToGwei,
  isValidBlockInput,
  normalizeBlockInput,
  getLatestBlockNumber,
  getBlock,
  getTransaction,
  getBlockSummary,
} from "./app.js";

describe("hexToNumber", () => {
  it("converts hex string to number", () => {
    expect(hexToNumber("0x0")).toBe(0);
    expect(hexToNumber("0xa")).toBe(10);
    expect(hexToNumber("0xff")).toBe(255);
    expect(hexToNumber("0x100")).toBe(256);
  });
});

describe("hexToBigInt", () => {
  it("converts hex string to bigint", () => {
    expect(hexToBigInt("0x0")).toBe(BigInt(0));
    expect(hexToBigInt("0xa")).toBe(BigInt(10));
    expect(hexToBigInt("0xffffffffffffffff")).toBe(BigInt("18446744073709551615"));
  });
});

describe("weiToBnb", () => {
  it("converts wei to BNB string", () => {
    expect(weiToBnb("0x0")).toBe("0");
    expect(weiToBnb("0x2386f26fc10000")).toBe("0.01");
    expect(weiToBnb("0xde0b6b3a7640000")).toBe("1");
    expect(weiToBnb("0x8ac7230489e80000")).toBe("10");
  });

  it("handles bigint input", () => {
    expect(weiToBnb(BigInt("1000000000000000000"))).toBe("1");
  });
});

describe("weiToGwei", () => {
  it("converts wei to Gwei string", () => {
    expect(weiToGwei("0x0")).toBe("0");
    expect(weiToGwei("0x3b9aca00")).toBe("1");
    expect(weiToGwei("0x5d21dba00")).toBe("25");
    expect(weiToGwei("0x174876e800")).toBe("100");
  });

  it("handles bigint input", () => {
    expect(weiToGwei(BigInt("1000000000"))).toBe("1");
  });
});

describe("isValidBlockInput", () => {
  it("returns true for valid block numbers", () => {
    expect(isValidBlockInput("12345")).toBe(true);
    expect(isValidBlockInput("0x12345")).toBe(true);
    expect(isValidBlockInput("35000000")).toBe(true);
  });

  it("returns true for valid block hashes", () => {
    expect(
      isValidBlockInput("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    ).toBe(true);
  });

  it("returns true for special block identifiers", () => {
    expect(isValidBlockInput("latest")).toBe(true);
    expect(isValidBlockInput("earliest")).toBe(true);
    expect(isValidBlockInput("pending")).toBe(true);
  });

  it("returns false for invalid input", () => {
    expect(isValidBlockInput("")).toBe(false);
    expect(isValidBlockInput("abc")).toBe(false);
    expect(isValidBlockInput("0x123")).toBe(true); // valid hex block number
    expect(isValidBlockInput("0xgg")).toBe(false); // invalid hex
  });
});

describe("normalizeBlockInput", () => {
  it("returns special identifiers as-is", () => {
    expect(normalizeBlockInput("latest")).toBe("latest");
    expect(normalizeBlockInput("earliest")).toBe("earliest");
    expect(normalizeBlockInput("pending")).toBe("pending");
  });

  it("converts decimal to hex", () => {
    expect(normalizeBlockInput("12345")).toBe("0x3039");
    expect(normalizeBlockInput("0")).toBe("0x0");
    expect(normalizeBlockInput("35000000")).toBe("0x2160ec0");
  });

  it("returns hex as-is", () => {
    expect(normalizeBlockInput("0x12345")).toBe("0x12345");
    expect(normalizeBlockInput("0x0")).toBe("0x0");
  });

  it("returns hash as-is", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    expect(normalizeBlockInput(hash)).toBe(hash);
  });
});

describe("getLatestBlockNumber", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns latest block number", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x2160ec0",
      }),
    });
    const blockNumber = await getLatestBlockNumber();
    expect(blockNumber).toBe(35000000);
  });

  it("throws on RPC error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32000, message: "Server error" },
      }),
    });
    await expect(getLatestBlockNumber()).rejects.toThrow();
  });
});

describe("getBlock", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns block with transaction hashes when includeTransactions is false", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: {
          number: "0x215f360",
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          parentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          timestamp: "0x65a12345",
          gasLimit: "0x1c9c380",
          gasUsed: "0x123456",
          miner: "0x0000000000000000000000000000000000000000",
          difficulty: "0x1",
          totalDifficulty: "0x1",
          size: "0x200",
          extraData: "0x",
          transactions: ["0xtx1", "0xtx2"],
        },
      }),
    });

    const block = await getBlock("35000000", false);
    expect(block).not.toBeNull();
    expect(block?.number).toBe("0x215f360");
    expect(block?.hash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(block?.transactionCount).toBe(0); // Transaction hashes won't be fetched when false
  });

  it("returns null for non-existent block", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: null,
      }),
    });
    const block = await getBlock("999999999", false);
    expect(block).toBeNull();
  });

  it("returns block with full transactions when includeTransactions is true", async () => {
    const mockTx = {
      hash: "0xtx1",
      blockNumber: "0x215f360",
      blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      from: "0xfrom",
      to: "0xto",
      value: "0x0",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      nonce: "0x0",
      input: "0x",
      transactionIndex: "0x0",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            number: "0x215f360",
            hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            parentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            timestamp: "0x65a12345",
            gasLimit: "0x1c9c380",
            gasUsed: "0x123456",
            miner: "0x0000000000000000000000000000000000000000",
            difficulty: "0x1",
            totalDifficulty: "0x1",
            size: "0x200",
            extraData: "0x",
            transactions: [mockTx],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "0x1" },
        }),
      });

    const block = await getBlock("35000000", true);
    expect(block).not.toBeNull();
    expect(block?.transactions.length).toBeGreaterThan(0);
  });
});

describe("getTransaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns transaction by hash", async () => {
    const mockTx = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      blockNumber: "0x215f360",
      blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      value: "0x2386f26fc10000",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      nonce: "0x0",
      input: "0x",
      transactionIndex: "0x0",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockTx,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "0x1" },
        }),
      });

    const tx = await getTransaction("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(tx).not.toBeNull();
    expect(tx?.hash).toBe(mockTx.hash);
    expect(tx?.from).toBe(mockTx.from);
    expect(tx?.status).toBe("success");
  });

  it("returns null for invalid hash", async () => {
    const tx = await getTransaction("0x123");
    expect(tx).toBeNull();
  });

  it("returns null for non-existent transaction", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: null,
      }),
    });
    const tx = await getTransaction("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(tx).toBeNull();
  });
});

describe("getBlockSummary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns block summary", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: {
          number: "0x2160ec0",
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          parentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          timestamp: "0x65a12345",
          gasLimit: "0x1c9c380",
          gasUsed: "0x123456",
          miner: "0x0000000000000000000000000000000000000000",
          difficulty: "0x1",
          totalDifficulty: "0x1",
          size: "0x200",
          extraData: "0x",
          transactions: [],
        },
      }),
    });

    const summary = await getBlockSummary("35000000");
    expect(summary).not.toBeNull();
    expect(summary?.number).toBe(35000000);
    expect(summary?.hash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  });

  it("returns null for non-existent block", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: null,
      }),
    });
    const summary = await getBlockSummary("999999999");
    expect(summary).toBeNull();
  });
});

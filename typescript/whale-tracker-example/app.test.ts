import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hexToNumber,
  hexToBigInt,
  weiToBnb,
  isWhaleTransaction,
  getLatestBlockNumber,
  trackWhales,
  trackRecentWhales,
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

  it("handles large values", () => {
    expect(weiToBnb("0x56bc75e2d63100000")).toBe("100");
    expect(weiToBnb("0x3635c9adc5dea00000")).toBe("1000");
  });
});

describe("isWhaleTransaction", () => {
  it("returns true for transactions above threshold", () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    expect(isWhaleTransaction(`0x${tenBNB}`, 10)).toBe(true);
    expect(isWhaleTransaction(`0x${tenBNB}`, 5)).toBe(true);
    
    const hundredBNB = BigInt(100 * 10 ** 18).toString(16);
    expect(isWhaleTransaction(`0x${hundredBNB}`, 10)).toBe(true);
  });

  it("returns false for transactions below threshold", () => {
    const fiveBNB = BigInt(5 * 10 ** 18).toString(16);
    expect(isWhaleTransaction(`0x${fiveBNB}`, 10)).toBe(false);
    
    const oneBNB = BigInt(1 * 10 ** 18).toString(16);
    expect(isWhaleTransaction(`0x${oneBNB}`, 10)).toBe(false);
  });

  it("handles exact threshold values", () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    expect(isWhaleTransaction(`0x${tenBNB}`, 10)).toBe(true);
    
    const justBelow = (BigInt(10 * 10 ** 18) - BigInt(1)).toString(16);
    expect(isWhaleTransaction(`0x${justBelow}`, 10)).toBe(false);
  });

  it("handles bigint input", () => {
    const tenBNB = BigInt(10 * 10 ** 18);
    expect(isWhaleTransaction(tenBNB, 10)).toBe(true);
    
    const fiveBNB = BigInt(5 * 10 ** 18);
    expect(isWhaleTransaction(fiveBNB, 10)).toBe(false);
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

  it("throws on HTTP error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await expect(getLatestBlockNumber()).rejects.toThrow();
  });
});

describe("trackWhales", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty result when no whale transactions found", async () => {
    const mockBlock = {
      number: "0x2160ec0",
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: "0x65a12345",
      transactions: [
        {
          hash: "0xtx1",
          from: "0xfrom",
          to: "0xto",
          value: "0x2386f26fc10000", // 0.01 BNB
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: "0x2160ec0",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockBlock,
        }),
      });

    const result = await trackWhales(35000000, 35000000, 10);
    expect(result.transactions).toHaveLength(0);
    expect(result.totalValue).toBe("0");
    expect(result.minValueBNB).toBe(10);
  });

  it("finds whale transactions above threshold", async () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    const mockBlock = {
      number: "0x2160ec0",
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: "0x65a12345",
      transactions: [
        {
          hash: "0xtx1",
          from: "0xfrom",
          to: "0xto",
          value: `0x${tenBNB}`,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockBlock,
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

    const result = await trackWhales(35000000, 35000000, 10);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].valueBNB).toBe("10");
    expect(parseFloat(result.totalValue)).toBeCloseTo(10, 4);
  });

  it("filters by target address", async () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    const mockBlock = {
      number: "0x2160ec0",
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: "0x65a12345",
      transactions: [
        {
          hash: "0xtx1",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: `0x${tenBNB}`,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
        {
          hash: "0xtx2",
          from: "0x3333333333333333333333333333333333333333",
          to: "0x4444444444444444444444444444444444444444",
          value: `0x${tenBNB}`,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockBlock,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "0x1" },
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

    const targetAddr = "0x1111111111111111111111111111111111111111";
    const result = await trackWhales(35000000, 35000000, 10, targetAddr);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].from.toLowerCase()).toBe(targetAddr.toLowerCase());
  });

  it("skips zero-value transactions", async () => {
    const mockBlock = {
      number: "0x2160ec0",
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: "0x65a12345",
      transactions: [
        {
          hash: "0xtx1",
          from: "0xfrom",
          to: "0xto",
          value: "0x0",
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: mockBlock,
      }),
    });

    const result = await trackWhales(35000000, 35000000, 10);
    expect(result.transactions).toHaveLength(0);
  });

  it("handles multiple blocks", async () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    const mockBlock1 = {
      number: "0x2160ec0",
      hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      timestamp: "0x65a12345",
      transactions: [
        {
          hash: "0xtx1",
          from: "0xfrom1",
          to: "0xto1",
          value: `0x${tenBNB}`,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec0",
          blockHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        },
      ],
    };

    const mockBlock2 = {
      number: "0x2160ec1",
      hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      timestamp: "0x65a12346",
      transactions: [
        {
          hash: "0xtx2",
          from: "0xfrom2",
          to: "0xto2",
          value: `0x${tenBNB}`,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          blockNumber: "0x2160ec1",
          blockHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockBlock1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "0x1" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: mockBlock2,
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

    const result = await trackWhales(35000000, 35000001, 10);
    expect(result.transactions.length).toBeGreaterThanOrEqual(2);
    expect(result.blockRange.from).toBe(35000000);
    expect(result.blockRange.to).toBe(35000001);
  });
});

describe("trackRecentWhales", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks recent blocks", async () => {
    const tenBNB = BigInt(10 * 10 ** 18).toString(16);
    
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: "0x2160ec5", // Block 35000005
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            number: "0x2160ec5",
            hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            timestamp: "0x65a12345",
            transactions: [
              {
                hash: "0xtx1",
                from: "0xfrom",
                to: "0xto",
                value: `0x${tenBNB}`,
                gas: "0x5208",
                gasPrice: "0x3b9aca00",
                blockNumber: "0x2160ec5",
                blockHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
              },
            ],
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

    const result = await trackRecentWhales(1, 10);
    expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    expect(result.blockRange.to).toBe(35000005);
  });
});

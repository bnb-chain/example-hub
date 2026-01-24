import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import {
  getBlockNumber,
  getBlock,
  getGasPrice,
  getBlockTime,
  getRecentTPS,
  getMetrics,
  createApp,
  type Block,
} from "./app.js";

function rpcOk<T>(result: T) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ result }),
  });
}

function rpcErr(message: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ error: { message } }),
  });
}

describe("getBlockNumber", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      rpcOk("0x1234")
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed block number", async () => {
    const n = await getBlockNumber();
    expect(n).toBe(0x1234);
  });

  it("calls eth_blockNumber", async () => {
    await getBlockNumber();
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("eth_blockNumber"),
      })
    );
  });
});

describe("getBlock", () => {
  const block: Block = {
    number: "0x1234",
    timestamp: "0x65a00000",
    transactions: ["0xa", "0xb"],
    gasUsed: "0x5208",
    gasLimit: "0x1e8480",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", rpcOk(block));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns block for latest", async () => {
    const b = await getBlock("latest");
    expect(b).toEqual(block);
  });

  it("returns block for number", async () => {
    vi.stubGlobal("fetch", rpcOk(block));
    const b = await getBlock(0x1234);
    expect(b).toEqual(block);
  });

  it("returns null when RPC returns null", async () => {
    vi.stubGlobal("fetch", rpcOk(null));
    const b = await getBlock(999);
    expect(b).toBeNull();
  });
});

describe("getGasPrice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", rpcOk("0x4a817c800")); // 20 Gwei
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns gas price as bigint", async () => {
    const g = await getGasPrice();
    expect(g).toBe(BigInt("0x4a817c800"));
  });
});

describe("getBlockTime", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body as string) : {};
        const method = body.method as string;
        const params = (body.params as unknown[]) || [];
        if (method === "eth_blockNumber") {
          return { ok: true, json: () => Promise.resolve({ result: "0x1235" }) };
        }
        if (method === "eth_getBlockByNumber") {
          const tag = params[0];
          if (tag === "latest") {
            return {
              ok: true,
              json: () =>
                Promise.resolve({
                  result: {
                    number: "0x1235",
                    timestamp: "0x65a00005",
                    transactions: [],
                    gasUsed: "0x0",
                    gasLimit: "0x1e8480",
                  },
                }),
            };
          }
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                result: {
                  number: "0x1234",
                  timestamp: "0x65a00002",
                  transactions: [],
                  gasUsed: "0x0",
                  gasLimit: "0x1e8480",
                },
              }),
          };
        }
        return { ok: true, json: () => Promise.resolve({ result: null }) };
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns positive block time (timestamp diff)", async () => {
    const t = await getBlockTime();
    expect(t).toBe(3); // 5 - 2
  });
});

describe("getRecentTPS", () => {
  beforeEach(() => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: "0x100" }),
        });
      }
      const offset = callCount - 2;
      const blockNum = 0x100 - offset;
      const ts = 0x65a00000 + (5 - offset) * 3;
      const txs = offset === 0 ? 10 : 8;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              number: `0x${blockNum.toString(16)}`,
              timestamp: `0x${ts.toString(16)}`,
              transactions: Array(txs).fill("0x0"),
              gasUsed: "0x0",
              gasLimit: "0x1e8480",
            },
          }),
      });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns TPS > 0 over sample blocks", async () => {
    const tps = await getRecentTPS(3);
    expect(typeof tps).toBe("number");
    expect(tps).toBeGreaterThanOrEqual(0);
  });
});

describe("getMetrics", () => {
  beforeEach(() => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: "0x2000" }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: "0x4a817c800" }),
        });
      }
      if (callCount === 3) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: {
                number: "0x2000",
                timestamp: "0x65a01000",
                transactions: ["0x1", "0x2", "0x3"],
                gasUsed: "0xdead",
                gasLimit: "0x1e8480",
              },
            }),
        });
      }
      if (callCount === 4) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: {
                number: "0x1fff",
                timestamp: "0x65a00ffa",
                transactions: ["0x1"],
                gasUsed: "0x0",
                gasLimit: "0x1e8480",
              },
            }),
        });
      }
      const offset = callCount - 5;
      const blockNum = 0x2000 - offset;
      const ts = 0x65a01000 - offset * 3;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              number: `0x${blockNum.toString(16)}`,
              timestamp: `0x${ts.toString(16)}`,
              transactions: Array(5).fill("0x0"),
              gasUsed: "0x0",
              gasLimit: "0x1e8480",
            },
          }),
      });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns metrics with all required fields", async () => {
    const m = await getMetrics(3);
    expect(m).toMatchObject({
      blockNumber: expect.any(Number),
      blockTimeSeconds: expect.any(Number),
      gasPriceGwei: expect.any(Number),
      tps: expect.any(Number),
      rpcLatencyMs: expect.any(Number),
      gasUsedPercent: expect.any(Number),
      sampleBlocks: 3,
    });
    expect(m.blockNumber).toBe(0x2000);
    expect(m.gasPriceGwei).toBeGreaterThan(0);
  });
});

describe("createApp", () => {
  it("returns Express app", () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  it("serves GET /api/metrics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const app = createApp();
    const r = await request(app).get("/api/metrics");
    expect(r.status).toBe(500);
    expect(r.body.error).toBeDefined();
    vi.unstubAllGlobals();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeAddress,
  isValidBscAddress,
  parseAbi,
  countPrivilegedFunctions,
  hasReentrancyIndicators,
  hasReentrancyGuard,
  isProxyOrUpgradeable,
  analyzeRisksBytecode,
  fetchContractFromBsctrace,
  runScan,
} from "./app.js";

describe("normalizeAddress", () => {
  it("returns lowercase 0x-prefixed string for valid address", () => {
    expect(normalizeAddress("0xAbC0123456789012345678901234567890aBcDeF")).toBe(
      "0xabc0123456789012345678901234567890abcdef"
    );
  });
  it("returns empty string for invalid format", () => {
    expect(normalizeAddress("0x123")).toBe("");
    expect(normalizeAddress("abc")).toBe("");
    expect(normalizeAddress("")).toBe("");
  });
});

describe("isValidBscAddress", () => {
  it("returns true for valid 0x40-hex", () => {
    expect(isValidBscAddress("0x0000000000000000000000000000000000000001")).toBe(true);
  });
  it("returns false for too short or non-hex", () => {
    expect(isValidBscAddress("0x123")).toBe(false);
    expect(isValidBscAddress("0xgg00000000000000000000000000000000000001")).toBe(false);
  });
});

describe("parseAbi", () => {
  it("returns array when given array", () => {
    const abi = [{ type: "function", name: "foo" }];
    expect(parseAbi(abi)).toEqual(abi);
  });
  it("parses JSON string", () => {
    const abi = '[{"type":"function","name":"bar"}]';
    expect(parseAbi(abi)).toEqual([{ type: "function", name: "bar" }]);
  });
  it("returns empty array for invalid input", () => {
    expect(parseAbi("not json")).toEqual([]);
    expect(parseAbi(null)).toEqual([]);
  });
});

describe("countPrivilegedFunctions", () => {
  it("counts owner, mint, pause etc.", () => {
    const abi = [
      { name: "owner" },
      { name: "mint" },
      { name: "transfer" },
    ];
    expect(countPrivilegedFunctions(abi)).toBe(2);
  });
  it("returns 0 when none", () => {
    expect(countPrivilegedFunctions([{ name: "balanceOf" }])).toBe(0);
  });
});

describe("hasReentrancyIndicators", () => {
  it("returns true for .call{value}", () => {
    expect(hasReentrancyIndicators("x.call{value: 1}()")).toBe(true);
  });
  it("returns true for .call(", () => {
    expect(hasReentrancyIndicators("target.call(data)")).toBe(true);
  });
  it("returns false for plain code", () => {
    expect(hasReentrancyIndicators("function foo() {}")).toBe(false);
  });
});

describe("hasReentrancyGuard", () => {
  it("returns true for ReentrancyGuard", () => {
    expect(hasReentrancyGuard("ReentrancyGuard")).toBe(true);
  });
  it("returns true for nonReentrant", () => {
    expect(hasReentrancyGuard("modifier nonReentrant")).toBe(true);
  });
  it("returns false when absent", () => {
    expect(hasReentrancyGuard("function withdraw()")).toBe(false);
  });
});

describe("isProxyOrUpgradeable", () => {
  it("returns true when proxy is 1", () => {
    expect(isProxyOrUpgradeable({ proxy: "1" })).toBe(true);
  });
  it("returns true when implementation set", () => {
    expect(isProxyOrUpgradeable({ implementation: "0x1234567890123456789012345678901234567890" })).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(isProxyOrUpgradeable({})).toBe(false);
    expect(isProxyOrUpgradeable({ proxy: "0" })).toBe(false);
  });
});

describe("analyzeRisksBytecode", () => {
  it("flags not a contract when no bytecode", () => {
    const { score, findings } = analyzeRisksBytecode("0x", {});
    expect(score).toBe(0);
    expect(findings.some((f) => f.label === "Not a contract")).toBe(true);
  });

  it("flags contract bytecode and returns score 0–100", () => {
    const bytecode = "0x6080604052348015600f57600080fd5b50";
    const { score, findings } = analyzeRisksBytecode(bytecode, {});
    expect(findings.some((f) => f.label === "Contract bytecode")).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("flags delegatecall when f4 in bytecode", () => {
    const bytecode = "0x608060405260f4"; // contains f4 (DELEGATECALL)
    const { findings } = analyzeRisksBytecode(bytecode, {});
    expect(findings.some((f) => f.label === "Delegatecall / proxy pattern")).toBe(true);
  });

  it("flags self-destruct when ff in bytecode", () => {
    const bytecode = "0x608060405260ff"; // contains ff (SELFDESTRUCT)
    const { findings } = analyzeRisksBytecode(bytecode, {});
    expect(findings.some((f) => f.label === "Self-destruct capable")).toBe(true);
  });

  it("flags creator info when meta.creator set", () => {
    const bytecode = "0x6080604052348015600f57600080fd5b50";
    const { findings } = analyzeRisksBytecode(bytecode, {
      creator: "0x1111111111111111111111111111111111111111",
    });
    expect(findings.some((f) => f.label === "Creator info")).toBe(true);
  });

  it("score is 0–100", () => {
    const bytecode = "0x6080604052348015600f57600080fd5b50";
    const { score } = analyzeRisksBytecode(bytecode, {});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("fetchContractFromBsctrace", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns bytecode and optional creator from BSCTrace-like JSON-RPC", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: "0x6080604052348015600f57600080fd5b506080",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            from: "0x1111111111111111111111111111111111111111",
            hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          },
        }),
      });
    const out = await fetchContractFromBsctrace(
      "0x0000000000000000000000000000000000000001",
      "test-key"
    );
    expect(out.bytecode).toBe("0x6080604052348015600f57600080fd5b506080");
    expect(out.creator).toBe("0x1111111111111111111111111111111111111111");
    expect(out.creationTxHash).toBe(
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
  });

  it("throws on RPC error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { message: "Invalid address" },
      }),
    });
    await expect(
      fetchContractFromBsctrace("0x0000000000000000000000000000000000000001", "key")
    ).rejects.toThrow();
  });
});

describe("runScan", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ScanResult with score and findings", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: "0x6080604052348015600f57600080fd5b506080",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { from: "0x1111111111111111111111111111111111111111", hash: "0xabc" },
        }),
      });
    const result = await runScan(
      "0x0000000000000000000000000000000000000001",
      "test-key"
    );
    expect(result.address).toBe("0x0000000000000000000000000000000000000001");
    expect(result.contractName).toBeNull();
    expect(result.verified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it("throws on invalid address", async () => {
    await expect(runScan("0x123", "key")).rejects.toThrow("Invalid");
  });
});

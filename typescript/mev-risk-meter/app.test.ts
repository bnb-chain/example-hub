import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeAddress,
  isValidBscAddress,
  isValidTxHash,
  hasSwapFunctions,
  hasPriceOracleDependencies,
  hasFlashLoanFunctions,
  isSwapTransaction,
  hasHighGasPrice,
  hasSignificantValue,
  analyzeContractMevRisks,
  analyzeTransactionMevRisks,
  fetchTransaction,
  fetchCurrentGasPrice,
  fetchContractCode,
  analyzeMevRisk,
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

describe("isValidTxHash", () => {
  it("returns true for valid 0x64-hex", () => {
    expect(isValidTxHash("0x" + "a".repeat(64))).toBe(true);
  });
  it("returns false for too short or non-hex", () => {
    expect(isValidTxHash("0x123")).toBe(false);
    expect(isValidTxHash("0x" + "g".repeat(64))).toBe(false);
  });
});

describe("hasSwapFunctions", () => {
  it("returns true when swap functions present", () => {
    const abi = [
      { name: "swapExactTokensForTokens" },
      { name: "transfer" },
    ];
    expect(hasSwapFunctions(abi)).toBe(true);
  });
  it("returns false when no swap functions", () => {
    const abi = [{ name: "balanceOf" }, { name: "transfer" }];
    expect(hasSwapFunctions(abi)).toBe(false);
  });
});

describe("hasPriceOracleDependencies", () => {
  it("returns true when oracle functions present", () => {
    const abi = [{ name: "getPrice" }, { name: "latestRoundData" }];
    expect(hasPriceOracleDependencies(abi)).toBe(true);
  });
  it("returns false when no oracle functions", () => {
    const abi = [{ name: "balanceOf" }];
    expect(hasPriceOracleDependencies(abi)).toBe(false);
  });
});

describe("hasFlashLoanFunctions", () => {
  it("returns true when flash loan functions present", () => {
    const abi = [{ name: "flashLoan" }, { name: "borrow" }];
    expect(hasFlashLoanFunctions(abi)).toBe(true);
  });
  it("returns false when no flash loan functions", () => {
    const abi = [{ name: "transfer" }];
    expect(hasFlashLoanFunctions(abi)).toBe(false);
  });
});

describe("isSwapTransaction", () => {
  it("returns true for swap transaction signatures", () => {
    expect(isSwapTransaction("0x38ed1739" + "0".repeat(56))).toBe(true);
    expect(isSwapTransaction("0x7ff36ab5" + "0".repeat(56))).toBe(true);
  });
  it("returns false for non-swap transactions", () => {
    expect(isSwapTransaction("0x12345678" + "0".repeat(56))).toBe(false);
  });
});

describe("hasHighGasPrice", () => {
  it("returns true when gas price is >20% higher", () => {
    const txGas = "0x" + (BigInt("20000000000") * BigInt(130) / BigInt(100)).toString(16);
    const currentGas = "0x" + BigInt("20000000000").toString(16);
    expect(hasHighGasPrice(txGas, currentGas)).toBe(true);
  });
  it("returns false when gas price is within normal range", () => {
    const txGas = "0x" + BigInt("20000000000").toString(16);
    const currentGas = "0x" + BigInt("20000000000").toString(16);
    expect(hasHighGasPrice(txGas, currentGas)).toBe(false);
  });
});

describe("hasSignificantValue", () => {
  it("returns true for values >0.1 BNB", () => {
    const value = "0x" + BigInt("200000000000000000").toString(16); // 0.2 BNB
    expect(hasSignificantValue(value)).toBe(true);
  });
  it("returns false for small values", () => {
    const value = "0x" + BigInt("10000000000000000").toString(16); // 0.01 BNB
    expect(hasSignificantValue(value)).toBe(false);
  });
});

describe("analyzeContractMevRisks", () => {
  it("flags swap functions", () => {
    const abi = [{ name: "swapExactTokensForTokens" }];
    const { score, findings } = analyzeContractMevRisks(abi);
    expect(findings.some((f) => f.label === "Swap functions detected")).toBe(true);
    expect(score).toBeLessThan(100);
  });

  it("flags flash loan functions", () => {
    const abi = [{ name: "flashLoan" }];
    const { score, findings } = analyzeContractMevRisks(abi);
    expect(findings.some((f) => f.label === "Flash loan functions")).toBe(true);
    expect(score).toBeLessThan(100);
  });

  it("flags price oracle dependencies", () => {
    const abi = [{ name: "getPrice" }];
    const { findings } = analyzeContractMevRisks(abi);
    expect(findings.some((f) => f.label === "Price oracle dependencies")).toBe(true);
  });

  it("score is 0–100", () => {
    const { score } = analyzeContractMevRisks([]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("analyzeTransactionMevRisks", () => {
  it("flags swap transactions", () => {
    const tx = { input: "0x38ed1739" + "0".repeat(56) };
    const { score, findings } = analyzeTransactionMevRisks(tx, "0x" + BigInt("20000000000").toString(16));
    expect(findings.some((f) => f.label === "Swap transaction detected")).toBe(true);
    expect(score).toBeLessThan(100);
  });

  it("flags large transaction values", () => {
    const tx = { value: "0x" + BigInt("200000000000000000").toString(16) };
    const { findings } = analyzeTransactionMevRisks(tx, "0x" + BigInt("20000000000").toString(16));
    expect(findings.some((f) => f.label === "Large transaction value")).toBe(true);
  });

  it("flags high gas prices", () => {
    const highGas = "0x" + (BigInt("20000000000") * BigInt(130) / BigInt(100)).toString(16);
    const currentGas = "0x" + BigInt("20000000000").toString(16);
    const tx = { gasPrice: highGas };
    const { findings } = analyzeTransactionMevRisks(tx, currentGas);
    expect(findings.some((f) => f.label === "High gas price")).toBe(true);
  });

  it("score is 0–100", () => {
    const tx = {};
    const { score } = analyzeTransactionMevRisks(tx, "0x" + BigInt("20000000000").toString(16));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("fetchTransaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns transaction data from RPC", async () => {
    const mockTx = {
      hash: "0x" + "a".repeat(64),
      from: "0x" + "1".repeat(40),
      to: "0x" + "2".repeat(40),
      value: "0x0",
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: mockTx }),
    });
    const result = await fetchTransaction("0x" + "a".repeat(64), "https://bsc-dataseed.bnbchain.org");
    expect(result.hash).toBe(mockTx.hash);
  });

  it("throws on RPC error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "Transaction not found" } }),
    });
    await expect(fetchTransaction("0x" + "a".repeat(64), "https://bsc-dataseed.bnbchain.org")).rejects.toThrow();
  });
});

describe("fetchCurrentGasPrice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns gas price from RPC", async () => {
    const mockGasPrice = "0x" + BigInt("20000000000").toString(16);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: mockGasPrice }),
    });
    const result = await fetchCurrentGasPrice("https://bsc-dataseed.bnbchain.org");
    expect(result).toBe(mockGasPrice);
  });

  it("throws on RPC error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "RPC error" } }),
    });
    await expect(fetchCurrentGasPrice("https://bsc-dataseed.bnbchain.org")).rejects.toThrow();
  });
});

describe("fetchContractCode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns contract code and isContract=true for contract", async () => {
    const mockCode = "0x6080604052348015600f57600080fd5b50";
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: mockCode }),
    });
    const result = await fetchContractCode("0x" + "1".repeat(40), "https://bsc-dataseed.bnbchain.org");
    expect(result.code).toBe(mockCode);
    expect(result.isContract).toBe(true);
  });

  it("returns isContract=false for EOA", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: "0x" }),
    });
    const result = await fetchContractCode("0x" + "1".repeat(40), "https://bsc-dataseed.bnbchain.org");
    expect(result.isContract).toBe(false);
  });
});

describe("analyzeMevRisk", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("analyzes transaction hash", async () => {
    const mockTx = {
      hash: "0x" + "a".repeat(64),
      input: "0x38ed1739" + "0".repeat(56),
      value: "0x0",
    };
    const mockGasPrice = "0x" + BigInt("20000000000").toString(16);
    
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockGasPrice }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockTx }),
      });

    const result = await analyzeMevRisk("0x" + "a".repeat(64), "https://bsc-dataseed.bnbchain.org");
    expect(result.transactionHash).toBe("0x" + "a".repeat(64));
    expect(result.contractType).toBe("Transaction");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("analyzes contract address", async () => {
    const mockCode = "0x6080604052348015600f57600080fd5b50";
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: mockCode }),
    });

    const result = await analyzeMevRisk("0x" + "1".repeat(40), "https://bsc-dataseed.bnbchain.org");
    expect(result.address).toBe("0x" + "1".repeat(40));
    expect(result.contractType).toBe("Contract");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("analyzes EOA address", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: "0x" }),
    });

    const result = await analyzeMevRisk("0x" + "1".repeat(40), "https://bsc-dataseed.bnbchain.org");
    expect(result.contractType).toBe("EOA");
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
  });

  it("throws on invalid input", async () => {
    await expect(analyzeMevRisk("invalid", "https://bsc-dataseed.bnbchain.org")).rejects.toThrow();
  });
});

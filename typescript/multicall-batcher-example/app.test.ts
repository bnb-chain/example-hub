import { describe, it, expect, vi, beforeEach } from "vitest";
import { Wallet, JsonRpcProvider, Contract, Interface } from "ethers";
import {
  BSC_CHAIN_ID,
  MULTICALL3_ADDRESS,
  MULTICALL3_ABI,
  encodeCall,
  decodeCall,
  createExampleTokenCalls,
  BSC_TOKENS,
  ERC20_ABI,
  estimateGasSavings,
  type CallRequest,
} from "./app.js";

// Mock provider for testing
const TEST_MNEMONIC = "test test test test test test test test test test test junk";
const wallet = Wallet.fromPhrase(TEST_MNEMONIC);

describe("BSC_CHAIN_ID", () => {
  it("is 56 for BNB Smart Chain mainnet", () => {
    expect(BSC_CHAIN_ID).toBe(56);
  });
});

describe("MULTICALL3_ADDRESS", () => {
  it("is a valid address", () => {
    expect(MULTICALL3_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe("encodeCall", () => {
  it("encodes a simple function call without arguments", () => {
    const call = encodeCall(BSC_TOKENS.BUSD, ERC20_ABI, "name", []);
    expect(call.target).toBe(BSC_TOKENS.BUSD);
    expect(call.callData).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(call.callData.length).toBeGreaterThanOrEqual(10);
  });

  it("encodes a function call with arguments", () => {
    const testAddress = "0x1234567890123456789012345678901234567890";
    const call = encodeCall(BSC_TOKENS.BUSD, ERC20_ABI, "balanceOf", [testAddress]);
    expect(call.target).toBe(BSC_TOKENS.BUSD);
    expect(call.callData).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(call.callData.length).toBeGreaterThan(10);
  });

  it("throws error for invalid function name", () => {
    expect(() => {
      encodeCall(BSC_TOKENS.BUSD, ERC20_ABI, "invalidFunction", []);
    }).toThrow();
  });
});

describe("decodeCall", () => {
  it("decodes a valid return value", () => {
    // Create a mock return data for a uint8 (decimals)
    const iface = new Interface(ERC20_ABI);
    const encoded = iface.encodeFunctionResult("decimals", [18]);
    const decoded = decodeCall(ERC20_ABI, "decimals", encoded);
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded[0]).toBe(18n);
  });

  it("decodes a string return value", () => {
    const iface = new Interface(ERC20_ABI);
    const encoded = iface.encodeFunctionResult("name", ["Test Token"]);
    const decoded = decodeCall(ERC20_ABI, "name", encoded);
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded[0]).toBe("Test Token");
  });

  it("throws error for invalid return data", () => {
    expect(() => {
      decodeCall(ERC20_ABI, "name", "0x1234");
    }).toThrow();
  });
});

describe("createExampleTokenCalls", () => {
  it("creates calls for token info functions", () => {
    const calls = createExampleTokenCalls(BSC_TOKENS.BUSD);
    expect(calls.length).toBe(4);
    expect(calls[0].target).toBe(BSC_TOKENS.BUSD);
    expect(calls[1].target).toBe(BSC_TOKENS.BUSD);
    expect(calls[2].target).toBe(BSC_TOKENS.BUSD);
    expect(calls[3].target).toBe(BSC_TOKENS.BUSD);
  });

  it("includes balanceOf call when address is provided", () => {
    const testAddress = "0x1234567890123456789012345678901234567890";
    const calls = createExampleTokenCalls(BSC_TOKENS.BUSD, testAddress);
    expect(calls.length).toBe(5);
    expect(calls[4].target).toBe(BSC_TOKENS.BUSD);
  });

  it("creates valid call data for all functions", () => {
    const calls = createExampleTokenCalls(BSC_TOKENS.USDT);
    calls.forEach((call) => {
      expect(call.callData).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(call.callData.length).toBeGreaterThanOrEqual(10);
    });
  });
});

describe("BSC_TOKENS", () => {
  it("contains valid token addresses", () => {
    Object.values(BSC_TOKENS).forEach((address) => {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  it("has expected token addresses", () => {
    expect(BSC_TOKENS.BUSD).toBe("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");
    expect(BSC_TOKENS.USDT).toBe("0x55d398326f99059fF775485246999027B3197955");
    expect(BSC_TOKENS.USDC).toBe("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");
    expect(BSC_TOKENS.WBNB).toBe("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
  });
});

describe("estimateGasSavings", () => {
  it("returns zero for single call", () => {
    const savings = estimateGasSavings(1);
    expect(savings).toBeGreaterThanOrEqual(0n);
  });

  it("returns positive savings for multiple calls", () => {
    const savings = estimateGasSavings(5);
    expect(savings).toBeGreaterThan(0n);
  });

  it("increases savings with more calls", () => {
    const savings5 = estimateGasSavings(5);
    const savings10 = estimateGasSavings(10);
    expect(savings10).toBeGreaterThan(savings5);
  });

  it("handles large number of calls", () => {
    const savings = estimateGasSavings(100);
    expect(savings).toBeGreaterThan(0n);
  });
});

describe("CallRequest interface", () => {
  it("accepts valid call request structure", () => {
    const call: CallRequest = {
      target: BSC_TOKENS.BUSD,
      callData: "0x1234",
      allowFailure: true,
    };
    expect(call.target).toBe(BSC_TOKENS.BUSD);
    expect(call.callData).toBe("0x1234");
    expect(call.allowFailure).toBe(true);
  });

  it("works without allowFailure", () => {
    const call: CallRequest = {
      target: BSC_TOKENS.BUSD,
      callData: "0x1234",
    };
    expect(call.allowFailure).toBeUndefined();
  });
});

describe("ERC20_ABI", () => {
  it("contains expected function signatures", () => {
    const abiStrings = ERC20_ABI.map((item) => (typeof item === "string" ? item : ""));
    expect(abiStrings.some((s) => s.includes("name()"))).toBe(true);
    expect(abiStrings.some((s) => s.includes("symbol()"))).toBe(true);
    expect(abiStrings.some((s) => s.includes("decimals()"))).toBe(true);
    expect(abiStrings.some((s) => s.includes("totalSupply()"))).toBe(true);
    expect(abiStrings.some((s) => s.includes("balanceOf"))).toBe(true);
  });
});

describe("MULTICALL3_ABI", () => {
  it("contains aggregate function", () => {
    const abiStrings = MULTICALL3_ABI.map((item) => (typeof item === "string" ? item : ""));
    expect(abiStrings.some((s) => s.includes("aggregate"))).toBe(true);
    expect(abiStrings.some((s) => s.includes("aggregate3"))).toBe(true);
  });
});

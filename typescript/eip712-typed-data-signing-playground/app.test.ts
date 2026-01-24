import { describe, it, expect } from "vitest";
import { Wallet } from "ethers";
import {
  BSC_CHAIN_ID,
  getBscMailTypedData,
  hashTypedData,
  hashDomain,
  hashStruct,
  verifyTypedDataSignature,
  getSignPayload,
  type EIP712TypedData,
} from "./app.js";

const MNEMONIC =
  "test test test test test test test test test test test junk";
const wallet = Wallet.fromPhrase(MNEMONIC);

describe("BSC_CHAIN_ID", () => {
  it("is 56 for BNB Smart Chain mainnet", () => {
    expect(BSC_CHAIN_ID).toBe(56);
  });
});

describe("getBscMailTypedData", () => {
  it("returns valid EIP-712 typed data with BSC domain", () => {
    const data = getBscMailTypedData();
    expect(data.domain.chainId).toBe(BSC_CHAIN_ID);
    expect(data.domain.name).toBe("BNB Cookbook");
    expect(data.primaryType).toBe("Mail");
    expect(data.types.Mail).toBeDefined();
    expect(data.types.Person).toBeDefined();
    expect(data.types.EIP712Domain).toBeDefined();
    expect(data.message.from).toEqual({
      name: "Alice",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    });
    expect(data.message.contents).toBe("Hello from BSC EIP-712!");
  });
});

describe("hashDomain", () => {
  it("returns 32-byte hex domain separator", () => {
    const data = getBscMailTypedData();
    const h = hashDomain(data.domain);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("is deterministic for same domain", () => {
    const data = getBscMailTypedData();
    expect(hashDomain(data.domain)).toBe(hashDomain(data.domain));
  });
});

describe("hashStruct", () => {
  it("returns 32-byte hex struct hash", () => {
    const data = getBscMailTypedData();
    const h = hashStruct(data.primaryType, data.types, data.message);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("is deterministic for same struct", () => {
    const data = getBscMailTypedData();
    const a = hashStruct(data.primaryType, data.types, data.message);
    const b = hashStruct(data.primaryType, data.types, data.message);
    expect(a).toBe(b);
  });

  it("changes when message changes", () => {
    const data = getBscMailTypedData();
    const h1 = hashStruct(data.primaryType, data.types, data.message);
    const alt = {
      ...data.message,
      contents: "Different",
    };
    const h2 = hashStruct(data.primaryType, data.types, alt);
    expect(h1).not.toBe(h2);
  });
});

describe("hashTypedData", () => {
  it("returns 32-byte hex full EIP-712 digest", () => {
    const data = getBscMailTypedData();
    const h = hashTypedData(data);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("is deterministic for same typed data", () => {
    const data = getBscMailTypedData();
    expect(hashTypedData(data)).toBe(hashTypedData(data));
  });
});

describe("getSignPayload", () => {
  it("returns object with domain, types, primaryType, message", () => {
    const data = getBscMailTypedData();
    const payload = getSignPayload(data) as Record<string, unknown>;
    expect(payload.domain).toBeDefined();
    expect(payload.types).toBeDefined();
    expect(payload.primaryType).toBe("Mail");
    expect(payload.message).toBeDefined();
  });

  it("is JSON-serializable", () => {
    const data = getBscMailTypedData();
    const payload = getSignPayload(data);
    expect(() => JSON.stringify(payload)).not.toThrow();
  });
});

describe("verifyTypedDataSignature", () => {
  it("recovers signer address from valid EIP-712 signature", async () => {
    const data = getBscMailTypedData();
    const sig = await wallet.signTypedData(
      data.domain,
      { Mail: data.types.Mail, Person: data.types.Person },
      data.message
    );
    const recovered = verifyTypedDataSignature(data, sig);
    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("produces same recoverable address for same data and signature", async () => {
    const data = getBscMailTypedData();
    const sig = await wallet.signTypedData(
      data.domain,
      { Mail: data.types.Mail, Person: data.types.Person },
      data.message
    );
    const a = verifyTypedDataSignature(data, sig);
    const b = verifyTypedDataSignature(data, sig);
    expect(a).toBe(b);
  });

  it("recovers different address when message differs", async () => {
    const data = getBscMailTypedData();
    const sig = await wallet.signTypedData(
      data.domain,
      { Mail: data.types.Mail, Person: data.types.Person },
      data.message
    );
    const altered: EIP712TypedData = {
      ...data,
      message: { ...data.message, contents: "Tampered" },
    };
    const recovered = verifyTypedDataSignature(altered, sig);
    expect(recovered.toLowerCase()).not.toBe(wallet.address.toLowerCase());
  });
});

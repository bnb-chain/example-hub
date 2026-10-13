import { expect } from "chai";
import { ethers } from "hardhat";
import { buildQris } from "../src/qris";
import { StaticRateSource } from "../src/rates";
import { QrisPayAgent, type AgentDeps } from "../src/agent";
import { BnbPaymentExecutor } from "../src/payment";
import { LocalSettlementAddress } from "../src/offramp";
import { TokenRegistry } from "../src/tokens";
import { LocalIdentityProvider, reputationGate } from "../src/identity";
import { SpendPolicy } from "../src/policy";
import { LocalReceiptLog, receiptId } from "../src/receipts";

const fields = {
  "00": "01",
  "01": "12",
  "26": "610014ID.CO.QRIS.WWW01189360091234567890120303UMI51440014ID.CO.QRIS.WWW0215ID10243012345670303UMI",
  "52": "5812",
  "53": "360",
  "54": "16000",
  "58": "ID",
  "59": "WARUNG PAK DANU",
  "60": "JAKARTA",
  "61": "12345",
};
const VALID_QRIS = buildQris(fields);

describe("Multi-token registry", function () {
  it("resolves BUSD, FDUSD, and U from the default registry", function () {
    const reg = new TokenRegistry();
    expect(reg.resolve("busd").symbol).to.equal("busd");
    expect(reg.resolve("fdusd").symbol).to.equal("fdusd");
    expect(reg.resolve("u").symbol).to.equal("u");
  });

  it("resolves by address (case-insensitive)", function () {
    const reg = new TokenRegistry();
    const addr = "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12";
    const entry = reg.resolve(addr);
    expect(entry.symbol).to.equal("busd");
  });

  it("throws for unknown tokens", function () {
    const reg = new TokenRegistry();
    expect(() => reg.resolve("unknown")).to.throw(/unknown token/);
  });

  it("registers a local MockBUSD for the demo", function () {
    const reg = new TokenRegistry();
    const mockAddr = ("0x" + "5".repeat(40)) as `0x${string}`;
    reg.register({
      symbol: "mockbusd",
      name: "Mock BUSD",
      address: mockAddr,
      decimals: 18,
      chainId: 31337,
      hasEip3009: true,
      eip3009: { name: "Mock BUSD", version: "1" },
    });
    expect(reg.resolve("mockbusd").address).to.equal(mockAddr);
    expect(reg.supportsEip3009("mockbusd")).to.equal(true);
  });
});

describe("ERC-8004 agent identity", function () {
  it("registers an agent and resolves its identity", async function () {
    const provider = new LocalIdentityProvider();
    const wallet = ("0x" + "1".repeat(40)) as `0x${string}`;
    const identity = await provider.register({
      wallet,
      name: "QRIS Pay Agent",
      description: "Pays QRIS merchants on BNB Chain",
      endpoints: ["https://agent.example.com/x402"],
    });
    expect(identity.agentId).to.match(/^agent-\d+$/);
    expect(identity.name).to.equal("QRIS Pay Agent");

    const resolved = await provider.resolveIdentity(wallet);
    expect(resolved).to.not.be.null;
    expect(resolved!.agentId).to.equal(identity.agentId);
  });

  it("records payments and updates reputation", async function () {
    const provider = new LocalIdentityProvider();
    const wallet = ("0x" + "2".repeat(40)) as `0x${string}`;
    const identity = await provider.register({
      wallet,
      name: "Test Agent",
      description: "test",
    });
    provider.recordPayment(identity.agentId, 1n * 10n ** 18n);
    provider.recordPayment(identity.agentId, 2n * 10n ** 18n);

    const rep = await provider.getReputation(identity.agentId);
    expect(rep.jobsCompleted).to.equal(2);
    expect(rep.totalVolumeUsd).to.equal(3n * 10n ** 18n);
    expect(rep.score).to.be.greaterThan(50);
  });
});

describe("Reputation gate", function () {
  it("allows high-reputation agents for large payments", function () {
    const result = reputationGate(
      {
        jobsCompleted: 10,
        totalVolumeUsd: 1000n * 10n ** 18n,
        disputes: 0,
        score: 80,
        lastActive: 0,
      },
      100n * 10n ** 18n
    );
    expect(result.allowed).to.equal(true);
  });

  it("blocks low-reputation agents", function () {
    const result = reputationGate(
      {
        jobsCompleted: 0,
        totalVolumeUsd: 0n,
        disputes: 5,
        score: 15,
        lastActive: 0,
      },
      1n * 10n ** 18n
    );
    expect(result.allowed).to.equal(false);
    expect(result.reason).to.match(/reputation/);
  });

  it("caps new agents at 10 USD until 5 jobs completed", function () {
    const result = reputationGate(
      {
        jobsCompleted: 3,
        totalVolumeUsd: 5n * 10n ** 18n,
        disputes: 0,
        score: 50,
        lastActive: 0,
      },
      20n * 10n ** 18n
    );
    expect(result.allowed).to.equal(false);
    expect(result.reason).to.match(/New agent capped/);
  });
});

describe("Spend policy", function () {
  it("allows payments within limits", function () {
    const policy = new SpendPolicy({
      perTxCap: 100n * 10n ** 18n,
      dailyCap: 500n * 10n ** 18n,
    });
    const recipient = ("0x" + "a".repeat(40)) as `0x${string}`;
    const result = policy.check(recipient, 50n * 10n ** 18n);
    expect(result.allowed).to.equal(true);
  });

  it("blocks payments exceeding per-tx cap", function () {
    const policy = new SpendPolicy({
      perTxCap: 10n * 10n ** 18n,
    });
    const recipient = ("0x" + "b".repeat(40)) as `0x${string}`;
    const result = policy.check(recipient, 20n * 10n ** 18n);
    expect(result.allowed).to.equal(false);
    expect(result.reason).to.match(/per-tx cap/);
  });

  it("tracks daily spend and blocks over-cap", function () {
    const policy = new SpendPolicy({
      dailyCap: 100n * 10n ** 18n,
      perTxCap: 100n * 10n ** 18n,
    });
    const recipient = ("0x" + "c".repeat(40)) as `0x${string}`;
    // First payment: 60
    const r1 = policy.check(recipient, 60n * 10n ** 18n);
    expect(r1.allowed).to.equal(true);
    policy.record(60n * 10n ** 18n);
    // Second payment: 50 — exceeds remaining daily cap (40)
    const r2 = policy.check(recipient, 50n * 10n ** 18n);
    expect(r2.allowed).to.equal(false);
    expect(r2.reason).to.match(/Daily spend/);
  });

  it("enforces allowlist", function () {
    const allowedAddr = ("0x" + "d".repeat(40)) as `0x${string}`;
    const blockedAddr = ("0x" + "e".repeat(40)) as `0x${string}`;
    const policy = new SpendPolicy({
      allowlist: [allowedAddr],
    });
    expect(policy.check(allowedAddr, 1n * 10n ** 18n).allowed).to.equal(true);
    expect(policy.check(blockedAddr, 1n * 10n ** 18n).allowed).to.equal(false);
  });

  it("enforces blocklist", function () {
    const blockedAddr = ("0x" + "f".repeat(40)) as `0x${string}`;
    const okAddr = ("0x" + "1".repeat(40)) as `0x${string}`;
    const policy = new SpendPolicy({
      blocklist: [blockedAddr],
    });
    expect(policy.check(blockedAddr, 1n * 10n ** 18n).allowed).to.equal(false);
    expect(policy.check(okAddr, 1n * 10n ** 18n).allowed).to.equal(true);
  });
});

describe("Receipt log", function () {
  it("generates deterministic receipt IDs", function () {
    const id1 = receiptId("0xabc123", 1700000000);
    const id2 = receiptId("0xabc123", 1700000000);
    const id3 = receiptId("0xabc124", 1700000000);
    expect(id1).to.equal(id2);
    expect(id1).to.not.equal(id3);
    expect(id1).to.match(/^rcpt_/);
  });

  it("appends and retrieves receipts", async function () {
    const log = new LocalReceiptLog();
    const receipt = {
      receiptId: "rcpt_test1",
      txHash: ("0x" + "0".repeat(64)) as `0x${string}`,
      timestamp: 1700000000,
      tokenSymbol: "BUSD",
      tokenAddress: ("0x" + "0".repeat(40)) as `0x${string}`,
      amountBase: 1n * 10n ** 18n,
      amountDisplay: "1.0",
      recipient: ("0x" + "0".repeat(40)) as `0x${string}`,
      mode: "direct" as const,
    };
    await log.append(receipt);
    const got = await log.get("rcpt_test1");
    expect(got).to.not.be.null;
    expect(got!.amountBase).to.equal(1n * 10n ** 18n);
  });
});

describe("Agent with multi-token + policy + receipts (local network)", function () {
  it("settles in FDUSD and records a receipt", async function () {
    const [_owner, payer, merchant] = await ethers.getSigners();

    // Deploy a MockBUSD (we use it as a stand-in for any 18-decimal stablecoin)
    const Token = await ethers.getContractFactory("MockBUSD");
    const token = await Token.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();
    const tokenAddress = (await token.getAddress()) as `0x${string}`;
    await token.transfer(payer.address, ethers.parseUnits("1000", 18));

    // Register the deployed token in the registry as a mock FDUSD
    const registry = new TokenRegistry();
    registry.register({
      symbol: "mockfdusd",
      name: "Mock FDUSD",
      address: tokenAddress,
      decimals: 18,
      chainId: 31337,
      hasEip3009: true,
      eip3009: { name: "Mock FDUSD", version: "1" },
    });

    const executor = new BnbPaymentExecutor({
      rpcUrl: "",
      chainId: 31337,
      busdAddress: tokenAddress,
    });
    executor.attachEthersSigner(payer);

    const deps: AgentDeps = {
      payment: executor,
      rateSource: new StaticRateSource(1 / 16000),
      offramp: new LocalSettlementAddress(merchant.address as `0x${string}`),
      token: registry.resolve("mockfdusd"),
      tokenRegistry: registry,
      spendRules: {
        perTxCap: 10n * 10n ** 18n,
        dailyCap: 100n * 10n ** 18n,
      },
    };
    const agent = new QrisPayAgent(deps);

    const plan = await agent.plan(VALID_QRIS);
    expect(plan.crcValid).to.equal(true);
    expect(plan.tokenSymbol).to.equal("MOCKFDUSD");
    expect(plan.policyAllowed).to.equal(true);

    const result = await agent.execute(plan);
    expect(result.txHash).to.match(/^0x[0-9a-f]{64}$/i);
    expect(result.receipt.receiptId).to.match(/^rcpt_/);
    expect(result.receipt.tokenSymbol).to.equal("MOCKFDUSD");
    expect(result.receipt.mode).to.equal("direct");

    const bal = await executor.balanceOf(plan.settlementAddress);
    expect(bal).to.equal(1_000_000_000_000_000_000n);

    // Verify receipt is in the log
    const logReceipts = await agent.receipts.list();
    expect(logReceipts.length).to.equal(1);
    expect(logReceipts[0].receiptId).to.equal(result.receipt.receiptId);
  });

  it("blocks payment when policy is violated", async function () {
    const [_owner, payer, merchant] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockBUSD");
    const token = await Token.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();
    const tokenAddress = (await token.getAddress()) as `0x${string}`;
    await token.transfer(payer.address, ethers.parseUnits("1000", 18));

    const executor = new BnbPaymentExecutor({
      rpcUrl: "",
      chainId: 31337,
      busdAddress: tokenAddress,
    });
    executor.attachEthersSigner(payer);

    // Build a QRIS with 500,000 IDR (31.25 BUSD at demo rate) — exceeds $10 perTxCap
    const highValueFields = { ...fields, "54": "500000" };
    const highValueQris = buildQris(highValueFields);

    const deps: AgentDeps = {
      payment: executor,
      rateSource: new StaticRateSource(1 / 16000),
      offramp: new LocalSettlementAddress(merchant.address as `0x${string}`),
      spendRules: {
        perTxCap: 10n * 10n ** 18n, // 10 BUSD max per tx
      },
    };
    const agent = new QrisPayAgent(deps);

    const plan = await agent.plan(highValueQris);
    expect(plan.policyAllowed).to.equal(false);
    expect(plan.policyReason).to.match(/per-tx cap/);

    let threw = false;
    try {
      await agent.execute(plan);
    } catch (e: any) {
      threw = true;
      expect(e.message).to.match(/spend policy/);
    }
    expect(threw).to.equal(true);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import {
  parseQris,
  parsePaymentQris,
  buildQris,
  crc16Ccitt,
} from "../src/qris";
import { StaticRateSource } from "../src/rates";
import { QrisPayAgent, type AgentDeps } from "../src/agent";
import { BnbPaymentExecutor } from "../src/payment";
import { LocalSettlementAddress } from "../src/offramp";

// Build a valid dynamic QRIS (amount 16000 IDR). CRC is computed by buildQris.
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

describe("QRIS parser", function () {
  it("validates CRC16-CCITT correctly", function () {
    const q = parseQris(VALID_QRIS);
    expect(q.crcValid).to.equal(true);
    expect(q.currency).to.equal("360");
    expect(q.amount).to.equal("16000");
    expect(q.merchantName).to.equal("WARUNG PAK DANU");
    expect(q.merchantCity).to.equal("JAKARTA");
  });

  it("detects a tampered CRC", function () {
    const tampered = VALID_QRIS.slice(0, -4) + "0000";
    const q = parseQris(tampered);
    expect(q.crcValid).to.equal(false);
  });

  it("rejects a static code with no amount", function () {
    const { "54": _drop, ...rest } = fields;
    const staticQris = buildQris(rest);
    expect(() => parsePaymentQris(staticQris)).to.throw(/no amount/);
  });
});

describe("IDR -> BUSD conversion", function () {
  it("converts using a static rate (1 BUSD = 18000 IDR)", async function () {
    const rate = StaticRateSource.fromRational(1n, 18000n);
    const busd = await rate.idrToStablecoin(18000n, {
      symbol: "busd",
      address: "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12",
      decimals: 18,
      name: "Binance USD",
      chainId: 56,
      hasEip3009: true,
    });
    expect(busd).to.equal(1_000_000_000_000_000_000n); // 1 BUSD = 1e18 base units
  });
});

describe("QrisPayAgent end-to-end (local network)", function () {
  it("parses, converts, and pays BUSD on-chain", async function () {
    const [owner, payer, merchant] = await ethers.getSigners();

    const Busd = await ethers.getContractFactory("MockBUSD");
    const busd = await Busd.deploy(ethers.parseUnits("1000", 18));
    await busd.waitForDeployment();
    const busdAddress = (await busd.getAddress()) as `0x${string}`;
    await busd.transfer(payer.address, ethers.parseUnits("1000", 18));

    const executor = new BnbPaymentExecutor({
      rpcUrl: "",
      chainId: 31337,
      busdAddress,
    });
    executor.attachEthersSigner(payer);

    const deps: AgentDeps = {
      payment: executor,
      rateSource: new StaticRateSource(1 / 16000),
      offramp: new LocalSettlementAddress(merchant.address as `0x${string}`),
    };
    const agent = new QrisPayAgent(deps);

    const plan = await agent.plan(VALID_QRIS);
    expect(plan.crcValid).to.equal(true);
    expect(plan.idrAmount).to.equal(16000n);
    expect(plan.tokenAmount).to.equal(1_000_000_000_000_000_000n);
    expect(plan.settlementAddress.toLowerCase()).to.equal(
      merchant.address.toLowerCase()
    );

    const result = await agent.execute(plan);
    expect(result.txHash).to.match(/^0x[0-9a-f]{64}$/i);

    const bal = await executor.balanceOf(plan.settlementAddress);
    expect(bal).to.equal(1_000_000_000_000_000_000n);
  });
});

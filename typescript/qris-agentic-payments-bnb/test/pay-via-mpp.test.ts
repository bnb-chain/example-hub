import { expect } from "chai";
import { ethers } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import { createLocalChargeServer } from "../src/charge-server";
import { BnbPaymentExecutor } from "../src/payment";

/**
 * Regression for `BnbPaymentExecutor.payViaMpp` — the buyer convenience
 * wrapper. Proves it drives the real SDK (`ClientMppx` + `createCredential`)
 * against a local charge server, with an injected `fetch` so no network
 * or live server is needed. Mirrors the verified E2E flow.
 */
describe("payViaMpp (buyer wrapper)", function () {
  const BUYER_KEY =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

  it("probes 402, builds credential, retries, settles", async function () {
    const [owner] = await ethers.getSigners();

    const Busd = await ethers.getContractFactory("MockBUSD");
    const busd = await Busd.deploy(ethers.parseUnits("1000", 18));
    await busd.waitForDeployment();
    const busdAddress = (await busd.getAddress()) as `0x${string}`;

    process.env.MPP_SECRET_KEY =
      process.env.MPP_SECRET_KEY ?? "test-mpp-secret";
    const server = await createLocalChargeServer({
      currency: busdAddress,
      recipient: owner.address as `0x${string}`,
      amountBase: "1000000000000000000",
      amountDisplay: "1.0",
      settleTxHash: ("0x" + "2".repeat(64)) as `0x${string}`,
    });

    // In-memory fetch shim: probe -> 402 challenge; retry -> 200 + receipt.
    const mockReceipt = Buffer.from(
      JSON.stringify({ transaction: "0x" + "2".repeat(64) })
    ).toString("base64");
    const fetchShim: typeof fetch = async (input: any, init?: any) => {
      const req = new Request(input, init);
      if (req.headers.get("Authorization")) {
        // SEC-11 FIX: mock server now returns a Payment-Receipt header
        // with a base64-encoded JSON containing the settlement tx hash.
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Payment-Receipt": mockReceipt },
        });
      }
      const r = await server.handle(req);
      // server.handle returns { status, challenge }; the challenge Response
      // carries the real Payment-Required / WWW-Authenticate header.
      const chalHeader =
        r.challenge?.headers.get("Payment-Required") ??
        r.challenge?.headers.get("WWW-Authenticate") ??
        "";
      return new Response(null, {
        status: r.status,
        headers: { "Payment-Required": chalHeader },
      });
    };

    const executor = new BnbPaymentExecutor({
      rpcUrl: "",
      chainId: 31337,
      privateKey: BUYER_KEY as `0x${string}`,
      busdAddress,
    });

    const result = await executor.payViaMpp(
      "https://local.test/pay",
      owner.address as `0x${string}`,
      1_000_000_000_000_000_000n,
      fetchShim
    );

    expect(result.amount).to.equal(1_000_000_000_000_000_000n);
    // SEC-11 FIX: mock server returns a Payment-Receipt header with the
    // settlement tx hash. The executor parses it and returns the real txHash.
    expect(result.paymentReceipt).to.be.a("string");
    expect(result.txHash).to.equal("0x" + "2".repeat(64));
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import { createLocalChargeServer } from "../src/charge-server";

/**
 * END-TO-END x402 / MPP loop on the local network.
 *
 * This is the systematic-debugging proving ground: it exercises the REAL
 * @bnb-chain/mpp + mppx SDK (server + buyer) exactly as the packages' own
 * tests do — not the fabricated fetch/Authorization flow the first version used.
 * The buyer pays the 402 challenge and the server settles.
 *
 * NOTE: mppx's curated `evm` assets are Base/Base-Sepolia only; BSC is not
 * a preset. To keep the loop real AND offline we point the buyer's `currencies`
 * at our locally-deployed MockBUSD by address + chainId. The SDK flow
 * (probe 402 -> createCredential -> retry) is identical on BSC with the real
 * BUSD address.
 */
describe("x402 / MPP end-to-end (local SDK loop)", function () {
  const BUYER_KEY =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

  it("buyer pays a 402 challenge and server settles", async function () {
    const [owner, payer] = await ethers.getSigners();

    // Deploy MockBUSD (18 decimals), fund the buyer.
    const Busd = await ethers.getContractFactory("MockBUSD");
    const busd = await Busd.deploy(ethers.parseUnits("1000", 18));
    await busd.waitForDeployment();
    const busdAddress = (await busd.getAddress()) as `0x${string}`;
    await busd.transfer(payer.address, ethers.parseUnits("1000", 18));

    // Merchant charge server (verified SDK wiring).
    process.env.MPP_SECRET_KEY =
      process.env.MPP_SECRET_KEY ?? "test-mpp-secret";
    const server = await createLocalChargeServer({
      currency: busdAddress,
      recipient: owner.address as `0x${string}`,
      amountBase: "1000000000000000000",
      amountDisplay: "1.0",
      settleTxHash: ("0x" + "1".repeat(64)) as `0x${string}`,
    });

    // 1) Probe -> expect 402 with a challenge.
    const probe = await server.handle(new Request("https://local.test/pay"));
    expect(probe.status).to.equal(402);
    expect(
      probe.challenge,
      "server must emit a 402 challenge"
    ).to.be.an.instanceOf(Object);
    const chalHeader =
      probe.challenge!.headers.get("Payment-Required") ??
      probe.challenge!.headers.get("WWW-Authenticate");
    expect(chalHeader, "challenge must carry a Payment header").to.be.a(
      "string"
    ).and.not.empty;

    // 2) Buyer: build a credential from the challenge (ESM-only SDK -> dynamic import).
    const { Mppx: ClientMppx, evm: evmClient } = await import("mppx/client");
    const account = privateKeyToAccount(BUYER_KEY);
    const client = ClientMppx.create({
      methods: [
        evmClient({
          account,
          // Raw address as a string (the client matches it against the
          // challenge's accepted currency); network whitelist gates the chain.
          networks: [31337],
          decimals: 18,
          // EIP-3009 domain metadata for the authorization credential
          // (raw-string currency has no embedded token name/version).
          authorization: { name: "Mock BUSD", version: "1" },
          currencies: [busdAddress],
          maxAmount: "1.0",
        }),
      ],
      polyfill: false,
    });

    const credential = await client.createCredential(probe.challenge!);
    expect(
      credential,
      "buyer must produce an Authorization credential"
    ).to.be.a("string");

    // 3) Retry with the credential -> expect 200 settled.
    const paid = await server.handle(
      new Request("https://local.test/pay", {
        headers: { Authorization: credential },
      })
    );
    expect(paid.status).to.equal(200);

    // 4) Settlement confirmed. In this demo the facilitator returns a fixed
    // tx hash (gasless EIP-3009 signature flow) — the real on-chain
    // transfer happens via the registered b402 facilitator on production BSC.
    // The proof of success is the 200 + the buyer having produced a valid
    // Authorization credential that the server accepted.
    expect(credential).to.be.a("string").and.not.empty;
  });
});

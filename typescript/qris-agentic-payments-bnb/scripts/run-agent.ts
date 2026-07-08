import { ethers } from "hardhat";
import { buildQris } from "../src/qris";
import { BnbPaymentExecutor } from "../src/payment";
import { QrisPayAgent, type AgentDeps } from "../src/agent";
import { createRateSource } from "../src/rates";
import { LocalSettlementAddress } from "../src/offramp";

/**
 * Self-contained demo on the in-process Hardhat network (no RPC/key/funds needed).
 *
 *   deploy MockBUSD -> fund payer -> parse a dynamic QRIS -> IDR->BUSD ->
 *   pay the merchant on-chain.
 */

async function main() {
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
    rateSource: createRateSource(process.env.RATE_SOURCE),
    offramp: new LocalSettlementAddress(merchant.address as `0x${string}`),
  };
  const agent = new QrisPayAgent(deps);

  // Build a valid dynamic QRIS (amount tag 54 = 16000 IDR => 1 BUSD at demo rate).
  const sample = buildQris({
    "00": "01",
    "01": "12",
    "26": "610014ID.CO.QRIS.WWW01189360091234567890120303UMI51440014ID.CO.QRIS.WWW0215ID10243012345670303UMI",
    "52": "5812",
    "53": "360",
    "54": "18000",
    "58": "ID",
    "59": "WARUNG PAK DANU",
    "60": "JAKARTA",
    "61": "12345",
  });

  console.log("=== QRIS PAY AGENT (BNB Chain) ===\n");
  console.log("Scanned code:\n", sample, "\n");

  const plan = await agent.plan(sample);
  console.log("--- Plan ---");
  console.log("Merchant    :", plan.recipient);
  console.log("IDR amount  :", plan.idrAmount.toString());
  console.log(
    `${plan.tokenSymbol} amount  :`,
    (Number(plan.tokenAmount) / 1e18).toFixed(18)
  );
  console.log("Settles to  :", plan.settlementAddress);
  console.log("Mode        :", plan.mode);
  console.log("CRC valid   :", plan.crcValid);
  console.log(
    "Identity    :",
    plan.identityChecked ? "verified" : "unverified"
  );
  console.log("Policy      :", plan.policyAllowed ?? "none");

  if (!plan.crcValid) {
    console.error("Aborting: QRIS CRC invalid.");
    process.exit(1);
  }

  const result = await agent.execute(plan);
  console.log("\n--- On-chain payment ---");
  console.log("txHash   :", result.txHash);
  console.log("to       :", result.recipient);
  console.log(
    "amount   :",
    (Number(result.amount) / 1e18).toFixed(18),
    plan.tokenSymbol
  );
  console.log("receipt  :", result.receipt.receiptId);
  const bal = await executor.balanceOf(plan.settlementAddress);
  console.log(
    "merchant balance:",
    (Number(bal) / 1e18).toFixed(18),
    plan.tokenSymbol
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

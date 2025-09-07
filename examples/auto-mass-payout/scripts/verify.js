const { run } = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const feeCollector = process.env.FEE_COLLECTOR;

  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS in your environment");
    process.exit(1);
  }

  if (!feeCollector) {
    console.error("❌ Please set FEE_COLLECTOR in your environment");
    process.exit(1);
  }

  console.log("Verifying contract...");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Fee Collector: ${feeCollector}`);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [feeCollector],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

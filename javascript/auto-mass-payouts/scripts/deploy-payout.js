const hre = require("hardhat");

async function main() {
  const Payout = await hre.ethers.getContractFactory("MassPayout");
  const payoutContract = await Payout.deploy();
  await payoutContract.waitForDeployment();

  console.log("MassPayout deployed to:", await payoutContract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

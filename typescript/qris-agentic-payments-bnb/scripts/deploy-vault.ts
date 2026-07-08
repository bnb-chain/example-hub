import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying QrisPaymentVault with:", deployer.address);

  // BUSD address on BSC mainnet (18 decimals)
  const busdAddress = "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12";

  const Vault = await ethers.getContractFactory("QrisPaymentVault");
  const vault = await Vault.deploy(busdAddress);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("QrisPaymentVault deployed to:", vaultAddress);
  console.log("Token (BUSD):", busdAddress);
  console.log("Owner:", deployer.address);

  // Verify on BscScan (if API key is set)
  if (process.env.BSCSCAN_API_KEY) {
    console.log("Verifying on BscScan...");
    const { run } = await import("hardhat");
    await run("verify:verify", {
      address: vaultAddress,
      constructorArguments: [busdAddress],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

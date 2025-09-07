const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check account balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "BNB");

  // Deploy the contract
  const MassPayouts = await ethers.getContractFactory("MassPayouts");

  // Set fee collector to deployer address
  const feeCollector = deployer.address;

  console.log("Deploying MassPayouts contract...");
  const massPayouts = await MassPayouts.deploy(feeCollector);

  await massPayouts.deployed();

  console.log("✅ MassPayouts deployed to:", massPayouts.address);
  console.log("Fee collector set to:", feeCollector);

  // Display deployment info
  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract Address: ${massPayouts.address}`);
  console.log(`Fee Collector: ${feeCollector}`);
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Gas Used: ${massPayouts.deployTransaction.gasLimit}`);
  console.log(`Transaction Hash: ${massPayouts.deployTransaction.hash}`);

  // Verify initial settings
  const serviceFee = await massPayouts.serviceFee();
  console.log(
    `Initial Service Fee: ${ethers.utils.formatEther(serviceFee)} BNB`
  );

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Verify the contract on BSCScan (optional)");
  console.log("3. Test the contract functionality");

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    contractAddress: massPayouts.address,
    feeCollector: feeCollector,
    deployer: deployer.address,
    transactionHash: massPayouts.deployTransaction.hash,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployment-${network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

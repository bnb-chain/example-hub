const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS_TESTNET;

  if (!contractAddress) {
    console.error(
      "❌ Please set VITE_CONTRACT_ADDRESS_TESTNET in your .env file"
    );
    return;
  }

  console.log("Testing contract functionality...");

  const [signer] = await ethers.getSigners();
  const MassPayouts = await ethers.getContractFactory("MassPayouts");
  const contract = MassPayouts.attach(contractAddress);

  try {
    // Test 1: Check service fee
    const serviceFee = await contract.serviceFee();
    console.log(`✅ Service fee: ${ethers.utils.formatEther(serviceFee)} BNB`);

    // Test 2: Check contract stats
    const stats = await contract.getContractStats();
    console.log(
      `✅ Contract balance: ${ethers.utils.formatEther(stats[0])} BNB`
    );
    console.log(`✅ Fee collector: ${stats[2]}`);

    // Test 3: Calculate BNB total for sample data
    const samplePayouts = [
      { recipient: signer.address, amount: ethers.utils.parseEther("0.1") },
      {
        recipient: "0x742dB5c6dB6aD6C6c0e8f4c5c7E8E8E8E8E8E8E8",
        amount: ethers.utils.parseEther("0.2"),
      },
    ];

    const total = await contract.calculateBNBTotal(samplePayouts);
    console.log(
      `✅ Total BNB needed for sample: ${ethers.utils.formatEther(total)} BNB`
    );

    console.log("🎉 Contract testing completed successfully!");
  } catch (error) {
    console.error("❌ Contract testing failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

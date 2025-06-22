require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BSCTEST_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const payoutAddress = process.env.PAYOUT_CONTRACT;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  const recipients = process.env.RECIPIENTS.split(",").map((r) => r.trim());

  const abi = [
    "function payout(address token, address[] recipients, uint256[] amounts) external",
  ];

  const contract = new ethers.Contract(payoutAddress, abi, wallet);

  // 👉 Tạo danh sách số lượng token tương ứng
  const amounts = process.env.AMOUNTS.split(",").map((a) =>
    ethers.parseUnits(a.trim(), 18)
  );

  const tx = await contract.payout(tokenAddress, recipients, amounts);
  await tx.wait();

  console.log("✅ Payout completed! Tx hash:", tx.hash);
}

main().catch(console.error);

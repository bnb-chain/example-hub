require("dotenv").config(); // 👉 Tải biến môi trường từ file .env
const hre = require("hardhat"); // 👉 Hardhat Runtime Env (bao gồm ethers, config, networks...)

async function main() {
  const MyToken = await hre.ethers.getContractFactory("MyToken");
  // 👉 Tạo contract factory từ MyToken.sol

  const token = await MyToken.deploy(1000000);
  // 👉 Deploy contract với tổng cung khởi tạo là 1 triệu (token sẽ tự nhân với 10 ** decimals())

  await token.waitForDeployment();
  // 👉 Chờ deploy hoàn tất (ethers v6 dùng hàm này thay cho .deployed())

  console.log("Token deployed to:", await token.getAddress());
  // 👉 In ra địa chỉ contract
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";

async function main() {
  // 1. 获取部署者钱包账户
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 2. 部署 AINFT 合约
  // 注意：因为我们的构造函数需要一个 `initialOwner` 参数，
  // 我们在部署时必须提供它。这里我们把部署者自己设为所有者。
  const ainft = await ethers.deployContract("AINFT", [deployer.address]);
  
  // 3. 等待合约部署完成
  await ainft.waitForDeployment();

  // 4. 打印出部署后的合约地址
  // aिनft.target 在 ethers v6 中是获取地址的推荐方式
  console.log(`AINFT contract deployed to: ${ainft.target}`);
}

// 标准的 Hardhat 脚本运行模式
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
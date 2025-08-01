import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
// 【修改点 1】: 变量名可以改得更通用，或者保持原样，重要的是它存储的是统一 Key
const ETHERSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // 【修改点 2】: 这是最关键的修改
  etherscan: {
    // 不再使用嵌套的 apiKey 对象，直接提供一个顶层的 apiKey
    apiKey: ETHERSCAN_API_KEY
  },
  sourcify: {
    // 顺便把 sourcify 的提示关掉，保持输出干净
    enabled: false
  }
};

export default config;
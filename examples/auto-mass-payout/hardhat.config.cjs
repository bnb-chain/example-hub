require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const TESTNET_RPC_URL =
  process.env.TESTNET_RPC_URL ||
  "https://data-seed-prebsc-2-s2.binance.org:8545/";
const MAINNET_RPC_URL =
  process.env.MAINNET_RPC_URL || "https://bsc-dataseed1.binance.org/";

if (!PRIVATE_KEY) {
  console.warn("⚠️  WARNING: PRIVATE_KEY not found in environment variables");
  console.warn("Please add your wallet private key to the .env file");
}

if (!BSCSCAN_API_KEY) {
  console.warn(
    "⚠️  WARNING: BSCSCAN_API_KEY not found in environment variables"
  );
  console.warn("Contract verification will not work without this key");
}

/**
 * Hardhat Configuration for BNB Chain Auto-Mass Payouts
 * Compatible with Ethers v5 and older Hardhat plugins
 */
module.exports = {
  // Solidity compiler configuration
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  // Network configurations
  networks: {
    // Local Hardhat network for testing
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20, // Generate 20 test accounts
        initialIndex: 0,
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        accountsBalance: "10000000000000000000000", // 10,000 ETH per account
      },
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
      timeout: 60000,
    },

    // BSC Testnet configuration
    bscTestnet: {
      url: TESTNET_RPC_URL,
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 gwei
      gas: 5000000, // 5M gas limit
      timeout: 120000, // 2 min timeout
      confirmations: 2, // Wait for 2 block confirmations
    },

    // BSC Mainnet configuration
    bscMainnet: {
      url: MAINNET_RPC_URL,
      chainId: 56,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 5000000000, // 5 gwei
      gas: 5000000, // 5M gas limit
      timeout: 120000, // 2 minutes timeout for mainnet
      confirmations: 3, // Wait for 3 block confirmations on mainnet
    },

    // Alternative RPC endpoints for redundancy
    bscTestnetBackup: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545/",
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 10000000000,
      gas: 5000000,
      timeout: 120000,
    },

    bscMainnetBackup: {
      url: "https://bsc-dataseed2.binance.org/",
      chainId: 56,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 5000000000,
      gas: 5000000,
      timeout: 120000,
    },
  },

  // Contract verification configuration
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY || "dummy-key",
      bscTestnet: BSCSCAN_API_KEY || "dummy-key",
    },
  },

  // Gas reporting configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 5, // 5 gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY, // for USD pricing
    token: "BNB",
    showTimeSpent: true,
    showMethodSig: true,
    outputFile: "gas-report.txt",
    noColors: false,
    excludeContracts: ["Migrations"],
  },

  // Path configurations
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha test configuration
  mocha: {
    timeout: 40000, // 40 second timeout for tests
    recursive: true,
  },
};

// Display helpful information when config is loaded
console.log("🔧 Hardhat configuration loaded successfully!");
console.log(`📋 Available networks: hardhat, bscTestnet, bscMainnet`);
console.log(`🔑 Private key loaded: ${PRIVATE_KEY ? "✅" : "❌"}`);
console.log(`🔍 BSCScan API key loaded: ${BSCSCAN_API_KEY ? "✅" : "❌"}`);

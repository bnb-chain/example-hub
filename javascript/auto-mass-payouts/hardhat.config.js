require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    bsctest: {
      url: process.env.BSCTEST_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};

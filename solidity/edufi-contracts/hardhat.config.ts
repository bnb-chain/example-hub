import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import "dotenv/config"

const { API_URL, PRIVATE_KEY } = process.env


const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  defaultNetwork: 'bsc',
  networks: {
    hardhat: {},
    bsc: {
      url: API_URL,
      chainId: 97,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: 'HQSWZD76WZNUSSICASNV9UKT38511WIAVZ',
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
}

export default config

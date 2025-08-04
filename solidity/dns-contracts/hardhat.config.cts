// from @nomicfoundation/hardhat-toolbox-viem to avoid module issue
import '@nomicfoundation/hardhat-ignition-viem'
import '@nomicfoundation/hardhat-verify'
import '@nomicfoundation/hardhat-viem'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import './tasks/hardhat-deploy-viem.cjs'

import dotenv from 'dotenv'
import 'hardhat-abi-exporter'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import '@nomicfoundation/hardhat-ethers'
import { HardhatUserConfig } from 'hardhat/config'

import('@ensdomains/hardhat-chai-matchers-viem')

// hardhat actions
import './tasks/esm_fix.cjs'

// Load environment variables from .env file. Suppress warnings using silent
// if this file is missing. dotenv will never modify any environment variables
// that have already been set.
// https://github.com/motdotla/dotenv
dotenv.config({ debug: false })

let real_accounts = undefined
if (process.env.DEPLOYER_KEY) {
  real_accounts = [
    process.env.DEPLOYER_KEY,
    process.env.OWNER_KEY || process.env.DEPLOYER_KEY,
  ]
}

// circular dependency shared with actions
export const archivedDeploymentPath = './deployments/archive'

const config = {
  networks: {
    hardhat: {
      saveDeployments: false,
      tags: ['test', 'legacy', 'use_root'],
      allowUnlimitedContractSize: true,
    },
    level3chain: {
      chainId: 7777771,
      url: 'http://localhost:8545', // or your DigitalOcean-hosted endpoint
      accounts: real_accounts,
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
      tags: ['test', 'legacy', 'use_root'],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 4,
      accounts: real_accounts,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 3,
      accounts: real_accounts,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 5,
      accounts: real_accounts,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 11155111,
      accounts: real_accounts,
    },
    testnet: {
      url: `https://bsc-testnet-rpc.publicnode.com`,
      tags: ['test', 'legacy', 'use_root'],
      chainId: 97,
      accounts: real_accounts,
    },
    mainnet: {
      url: `https://bsc-dataseed1.binance.org/`,
      tags: ['legacy', 'use_root'],
      chainId: 56,
      accounts: real_accounts,
    },
    neondevnet: {
      url: 'https://devnet.neonevm.org',
      accounts: real_accounts,
      chainId: 245022926,
      allowUnlimitedContractSize: false,
      tags: ['test', 'legacy', 'use_root'],
      gas: 30000000,
    },
    neonmainnet: {
      url: 'https://neon-proxy-mainnet.solana.p2p.org',
      accounts: real_accounts,
      chainId: 245022934,
      allowUnlimitedContractSize: false,
    },
  },
  mocha: {},
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
      // for DummyOldResolver contract
      {
        version: '0.4.11',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
      {
        version: '0.7.6',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
    ],
    overrides: {
      'node_modules/@uniswap/v3-periphery/**': { version: '0.7.6' },
      'contracts/ethregistrar/ETHRegistrarController.sol': {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1200,
          },
        },
      },
    },
  },
  abiExporter: {
    path: './build/contracts',
    runOnCompile: true,
    clear: true,
    flat: true,
    except: [
      'Controllable$',
      'INameWrapper$',
      'SHA1$',
      'Ownable$',
      'NameResolver$',
      'TestBytesUtils$',
      'legacy/*',
    ],
    spacing: 2,
    pretty: true,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 1,
      56: '0x04A1ceEBdEB45E055772e1cbAd48bb738E7414Fa',
      97: '0x2A0D7311fA7e9aC2890CFd8219b2dEf0c206E79B',
    },
  },
  external: {
    contracts: [
      {
        artifacts: [archivedDeploymentPath],
      },
    ],
  },
} satisfies HardhatUserConfig

export default config;

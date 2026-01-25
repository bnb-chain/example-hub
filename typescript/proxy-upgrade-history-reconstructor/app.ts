import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// EIP-1967 Proxy Storage Slots
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
const BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

// Common upgrade event signatures
const UPGRADED_EVENT = 'Upgraded(address indexed implementation)';
const UPGRADED_V2_EVENT = 'Upgraded(address indexed implementation, address indexed admin)';
const IMPLEMENTATION_CHANGED_EVENT = 'ImplementationChanged(address indexed oldImplementation, address indexed newImplementation)';
const ADMIN_CHANGED_EVENT = 'AdminChanged(address indexed previousAdmin, address indexed newAdmin)';
const BEACON_UPGRADED_EVENT = 'BeaconUpgraded(address indexed beacon)';

export interface UpgradeEvent {
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  eventName: string;
  oldImplementation?: string;
  newImplementation?: string;
  admin?: string;
  beacon?: string;
}

export interface ProxyInfo {
  proxyAddress: string;
  currentImplementation: string | null;
  currentAdmin: string | null;
  currentBeacon: string | null;
  proxyType: 'EIP-1967' | 'EIP-1822' | 'Beacon' | 'Custom' | 'Unknown';
  isProxy: boolean;
}

export interface UpgradeHistory {
  proxyInfo: ProxyInfo;
  upgradeEvents: UpgradeEvent[];
  totalUpgrades: number;
  firstUpgradeBlock: number | null;
  lastUpgradeBlock: number | null;
}

export interface KnownProxy {
  address: string;
  name: string;
  type: string;
  description: string;
}

export interface ProxyScanResult {
  address: string;
  proxyInfo: ProxyInfo;
  isKnownProxy: boolean;
  knownProxyInfo?: KnownProxy;
  error?: string;
}

export interface ProxyScanResponse {
  results: ProxyScanResult[];
  totalScanned: number;
  proxiesFound: number;
  knownProxiesFound: number;
}

/**
 * Get provider for BSC network
 */
export function getBSCProvider(): ethers.Provider {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Check if an address is a contract
 */
export async function isContract(address: string, provider: ethers.Provider): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    return code !== '0x' && code !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Read storage slot value
 */
export async function getStorageSlot(
  address: string,
  slot: string,
  provider: ethers.Provider
): Promise<string> {
  try {
    const value = await provider.getStorage(address, slot);
    return value;
  } catch (error) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

/**
 * Extract address from storage slot (last 20 bytes)
 */
export function extractAddressFromSlot(slotValue: string): string | null {
  if (!slotValue || slotValue === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return null;
  }
  try {
    // Address is stored in the last 20 bytes (40 hex chars)
    const addressHex = '0x' + slotValue.slice(-40);
    return ethers.getAddress(addressHex);
  } catch (error) {
    return null;
  }
}

/**
 * Detect proxy type and get current implementation
 */
export async function detectProxy(
  proxyAddress: string,
  provider: ethers.Provider
): Promise<ProxyInfo> {
  const isContractAddress = await isContract(proxyAddress, provider);
  if (!isContractAddress) {
    return {
      proxyAddress,
      currentImplementation: null,
      currentAdmin: null,
      currentBeacon: null,
      proxyType: 'Unknown',
      isProxy: false
    };
  }

  // Check EIP-1967 implementation slot
  const implementationSlot = await getStorageSlot(proxyAddress, IMPLEMENTATION_SLOT, provider);
  const implementation = extractAddressFromSlot(implementationSlot);
  
  // Check EIP-1967 admin slot
  const adminSlot = await getStorageSlot(proxyAddress, ADMIN_SLOT, provider);
  const admin = extractAddressFromSlot(adminSlot);
  
  // Check EIP-1967 beacon slot
  const beaconSlot = await getStorageSlot(proxyAddress, BEACON_SLOT, provider);
  const beacon = extractAddressFromSlot(beaconSlot);

  if (implementation) {
    return {
      proxyAddress,
      currentImplementation: implementation,
      currentAdmin: admin,
      currentBeacon: beacon,
      proxyType: 'EIP-1967',
      isProxy: true
    };
  }

  if (beacon) {
    return {
      proxyAddress,
      currentImplementation: null,
      currentAdmin: admin,
      currentBeacon: beacon,
      proxyType: 'Beacon',
      isProxy: true
    };
  }

  // Could be EIP-1822 or custom proxy - try to detect by checking for common proxy patterns
  // For now, mark as Unknown if no standard slots found
  return {
    proxyAddress,
    currentImplementation: null,
    currentAdmin: admin,
    currentBeacon: null,
    proxyType: 'Unknown',
    isProxy: false
  };
}

/**
 * Get upgrade events from contract
 */
export async function getUpgradeEvents(
  proxyAddress: string,
  provider: ethers.Provider,
  fromBlock: number = 0,
  toBlock: number | 'latest' = 'latest'
): Promise<UpgradeEvent[]> {
  const events: UpgradeEvent[] = [];
  
  // Create filter for common upgrade events
  const eventFilters = [
    {
      name: 'Upgraded',
      signature: 'event Upgraded(address indexed implementation)',
      abi: ['event Upgraded(address indexed implementation)']
    },
    {
      name: 'UpgradedV2',
      signature: 'event Upgraded(address indexed implementation, address indexed admin)',
      abi: ['event Upgraded(address indexed implementation, address indexed admin)']
    },
    {
      name: 'ImplementationChanged',
      signature: 'event ImplementationChanged(address indexed oldImplementation, address indexed newImplementation)',
      abi: ['event ImplementationChanged(address indexed oldImplementation, address indexed newImplementation)']
    },
    {
      name: 'AdminChanged',
      signature: 'event AdminChanged(address indexed previousAdmin, address indexed newAdmin)',
      abi: ['event AdminChanged(address indexed previousAdmin, address indexed newAdmin)']
    },
    {
      name: 'BeaconUpgraded',
      signature: 'event BeaconUpgraded(address indexed beacon)',
      abi: ['event BeaconUpgraded(address indexed beacon)']
    }
  ];

  for (const eventFilter of eventFilters) {
    try {
      const contract = new ethers.Contract(proxyAddress, eventFilter.abi, provider);
      // Get event topic hash from signature
      const eventTopic = ethers.id(eventFilter.signature);
      
      const logs = await provider.getLogs({
        address: proxyAddress,
        topics: [eventTopic],
        fromBlock: typeof fromBlock === 'number' ? fromBlock : 0,
        toBlock: typeof toBlock === 'number' ? toBlock : 'latest'
      });

      for (const log of logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });

          if (parsedLog) {
            const block = await provider.getBlock(log.blockNumber);
            const timestamp = block?.timestamp || 0;

            let upgradeEvent: UpgradeEvent;

            if (eventFilter.name === 'Upgraded') {
              upgradeEvent = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp,
                eventName: 'Upgraded',
                newImplementation: parsedLog.args[0] as string
              };
            } else if (eventFilter.name === 'UpgradedV2') {
              upgradeEvent = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp,
                eventName: 'Upgraded',
                newImplementation: parsedLog.args[0] as string,
                admin: parsedLog.args[1] as string
              };
            } else if (eventFilter.name === 'ImplementationChanged') {
              upgradeEvent = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp,
                eventName: 'ImplementationChanged',
                oldImplementation: parsedLog.args[0] as string,
                newImplementation: parsedLog.args[1] as string
              };
            } else if (eventFilter.name === 'AdminChanged') {
              upgradeEvent = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp,
                eventName: 'AdminChanged',
                admin: parsedLog.args[1] as string
              };
            } else if (eventFilter.name === 'BeaconUpgraded') {
              upgradeEvent = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp,
                eventName: 'BeaconUpgraded',
                beacon: parsedLog.args[0] as string
              };
            } else {
              continue;
            }

            events.push(upgradeEvent);
          }
        } catch (error) {
          // Skip unparseable logs
          continue;
        }
      }
    } catch (error) {
      // Skip events that don't exist on this contract
      continue;
    }
  }

  // Sort by block number
  events.sort((a, b) => a.blockNumber - b.blockNumber);

  return events;
}

/**
 * Validate and normalize a BSC address
 * @throws Error with helpful message if address is invalid
 */
export function validateAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }

  // Remove whitespace
  address = address.trim();

  // Check if it looks like a transaction hash (64 hex chars + 0x = 66 chars)
  if (address.length === 66 && address.startsWith('0x')) {
    throw new Error(
      `Invalid address format: "${address}"\n` +
      `This appears to be a transaction hash (32 bytes), not a BSC contract address.\n` +
      `BSC addresses must be 20 bytes (40 hex characters + '0x' = 42 characters total).\n` +
      `Example: 0x1234567890123456789012345678901234567890`
    );
  }

  // Check basic format
  if (!address.startsWith('0x')) {
    throw new Error(
      `Invalid address format: "${address}"\n` +
      `BSC address must start with '0x'`
    );
  }

  // Check length (should be 42 chars: 0x + 40 hex chars)
  if (address.length !== 42) {
    throw new Error(
      `Invalid address format: "${address}"\n` +
      `BSC address must be 42 characters (0x + 40 hex characters), but got ${address.length} characters.\n` +
      `Example: 0x1234567890123456789012345678901234567890`
    );
  }

  // Check if it's valid hex
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(
      `Invalid address format: "${address}"\n` +
      `BSC address must contain only hexadecimal characters (0-9, a-f, A-F)`
    );
  }

  try {
    return ethers.getAddress(address);
  } catch (error: any) {
    throw new Error(
      `Invalid BSC address: "${address}"\n` +
      `Error: ${error.message}\n` +
      `Please provide a valid 20-byte BSC address (42 characters total).`
    );
  }
}

/**
 * Get list of known BSC proxy addresses
 */
export function getKnownProxies(): KnownProxy[] {
  try {
    // Try dist folder first (for compiled code), then root folder
    let filePath = path.join(__dirname, 'known-proxies.json');
    if (!fs.existsSync(filePath)) {
      // If not in dist, try parent directory
      filePath = path.join(__dirname, '..', 'known-proxies.json');
    }
    if (!fs.existsSync(filePath)) {
      // If still not found, try current working directory
      filePath = path.join(process.cwd(), 'known-proxies.json');
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return [...data.proxies, ...data.testnet];
  } catch (error) {
    console.warn('Could not load known proxies file:', error);
    return [];
  }
}

/**
 * Scan multiple addresses and suggest which are proxies
 */
export async function scanAndSuggestProxies(
  addresses: string[],
  includeKnownProxies: boolean = true
): Promise<ProxyScanResponse> {
  const provider = getBSCProvider();
  const knownProxies = includeKnownProxies ? getKnownProxies() : [];
  const knownProxyMap = new Map<string, KnownProxy>();
  
  knownProxies.forEach(proxy => {
    try {
      const normalized = ethers.getAddress(proxy.address);
      knownProxyMap.set(normalized, proxy);
    } catch (error) {
      // Skip invalid addresses
    }
  });

  const results: ProxyScanResult[] = [];
  let proxiesFound = 0;
  let knownProxiesFound = 0;

  // Process addresses in parallel with a limit to avoid overwhelming the RPC
  const BATCH_SIZE = 5;
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (address) => {
      try {
        const normalizedAddress = validateAddress(address);
        const proxyInfo = await detectProxy(normalizedAddress, provider);
        const isKnownProxy = knownProxyMap.has(normalizedAddress);
        const knownProxyInfo = isKnownProxy ? knownProxyMap.get(normalizedAddress) : undefined;

        if (proxyInfo.isProxy) {
          proxiesFound++;
        }
        if (isKnownProxy) {
          knownProxiesFound++;
        }

        return {
          address: normalizedAddress,
          proxyInfo,
          isKnownProxy,
          knownProxyInfo
        };
      } catch (error: any) {
        // Return error result for invalid addresses
        return {
          address,
          proxyInfo: {
            proxyAddress: address,
            currentImplementation: null,
            currentAdmin: null,
            currentBeacon: null,
            proxyType: 'Unknown' as const,
            isProxy: false
          },
          isKnownProxy: false,
          error: error.message
        } as ProxyScanResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return {
    results,
    totalScanned: addresses.length,
    proxiesFound,
    knownProxiesFound
  };
}

/**
 * Reconstruct upgrade history for a proxy contract
 */
export async function reconstructUpgradeHistory(
  proxyAddress: string,
  fromBlock?: number,
  toBlock?: number | 'latest'
): Promise<UpgradeHistory> {
  const provider = getBSCProvider();
  const normalizedAddress = validateAddress(proxyAddress);

  // Detect proxy type and current state
  const proxyInfo = await detectProxy(normalizedAddress, provider);

  if (!proxyInfo.isProxy) {
    return {
      proxyInfo,
      upgradeEvents: [],
      totalUpgrades: 0,
      firstUpgradeBlock: null,
      lastUpgradeBlock: null
    };
  }

  // Get current block if toBlock not specified
  const currentBlock = toBlock === undefined 
    ? await provider.getBlockNumber() 
    : (typeof toBlock === 'number' ? toBlock : await provider.getBlockNumber());

  // Get upgrade events
  const upgradeEvents = await getUpgradeEvents(
    normalizedAddress,
    provider,
    fromBlock || 0,
    toBlock || currentBlock
  );

  // If no events found but we have implementation, create a synthetic event
  if (upgradeEvents.length === 0 && proxyInfo.currentImplementation) {
    const currentBlockInfo = await provider.getBlock('latest');
    upgradeEvents.push({
      blockNumber: currentBlockInfo?.number || currentBlock,
      transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: currentBlockInfo?.timestamp || Math.floor(Date.now() / 1000),
      eventName: 'CurrentImplementation',
      newImplementation: proxyInfo.currentImplementation
    });
  }

  const firstUpgradeBlock = upgradeEvents.length > 0 ? upgradeEvents[0].blockNumber : null;
  const lastUpgradeBlock = upgradeEvents.length > 0 ? upgradeEvents[upgradeEvents.length - 1].blockNumber : null;

  return {
    proxyInfo,
    upgradeEvents,
    totalUpgrades: upgradeEvents.length,
    firstUpgradeBlock,
    lastUpgradeBlock
  };
}

/**
 * Main function for CLI usage
 */
export async function main() {
  let proxyAddress = process.env.PROXY_ADDRESS || process.argv[2];
  
  // If no address provided, auto-select first known proxy
  if (!proxyAddress) {
    const knownProxies = getKnownProxies();
    if (knownProxies.length > 0) {
      proxyAddress = knownProxies[0].address;
      console.log(`No address provided. Auto-selecting known proxy: ${knownProxies[0].name}`);
      console.log(`Address: ${proxyAddress}\n`);
    } else {
      console.error('Usage: npm start [proxy-address] [from-block] [to-block]');
      console.error('Or set PROXY_ADDRESS, FROM_BLOCK, TO_BLOCK in .env file');
      console.error('No known proxies found to auto-select.');
      process.exit(1);
    }
  }

  // Validate address format early with helpful error message
  try {
    validateAddress(proxyAddress);
  } catch (error: any) {
    console.error('❌ Address Validation Error:');
    console.error(error.message);
    process.exit(1);
  }

  const fromBlockStr = process.env.FROM_BLOCK || process.argv[3];
  const fromBlock = fromBlockStr ? parseInt(fromBlockStr) : undefined;
  const toBlockStr = process.env.TO_BLOCK || process.argv[4];
  const toBlock = toBlockStr 
    ? (toBlockStr === 'latest' ? 'latest' : parseInt(toBlockStr))
    : undefined;

  console.log(`Reconstructing upgrade history for: ${proxyAddress}`);
  if (fromBlock !== undefined) {
    console.log(`From block: ${fromBlock}`);
  }
  if (toBlock !== undefined) {
    console.log(`To block: ${toBlock}`);
  }
  console.log('');

  const history = await reconstructUpgradeHistory(proxyAddress, fromBlock, toBlock);

  console.log('Proxy Information:');
  console.log(`  Address: ${history.proxyInfo.proxyAddress}`);
  console.log(`  Type: ${history.proxyInfo.proxyType}`);
  console.log(`  Is Proxy: ${history.proxyInfo.isProxy}`);
  console.log(`  Current Implementation: ${history.proxyInfo.currentImplementation || 'N/A'}`);
  console.log(`  Current Admin: ${history.proxyInfo.currentAdmin || 'N/A'}`);
  console.log(`  Current Beacon: ${history.proxyInfo.currentBeacon || 'N/A'}`);
  console.log('');

  console.log(`Upgrade History (${history.totalUpgrades} events):`);
  if (history.firstUpgradeBlock) {
    console.log(`  First Upgrade Block: ${history.firstUpgradeBlock}`);
  }
  if (history.lastUpgradeBlock) {
    console.log(`  Last Upgrade Block: ${history.lastUpgradeBlock}`);
  }
  console.log('');

  history.upgradeEvents.forEach((event, index) => {
    const date = new Date(event.timestamp * 1000).toISOString();
    console.log(`Event ${index + 1}:`);
    console.log(`  Event: ${event.eventName}`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  Timestamp: ${date}`);
    console.log(`  Transaction: ${event.transactionHash}`);
    if (event.oldImplementation) {
      console.log(`  Old Implementation: ${event.oldImplementation}`);
    }
    if (event.newImplementation) {
      console.log(`  New Implementation: ${event.newImplementation}`);
    }
    if (event.admin) {
      console.log(`  Admin: ${event.admin}`);
    }
    if (event.beacon) {
      console.log(`  Beacon: ${event.beacon}`);
    }
    console.log('');
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}


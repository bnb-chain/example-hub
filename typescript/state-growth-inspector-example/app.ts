import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';

dotenv.config();

// Storage slot ABI
const STORAGE_ABI = [
  'function getStorageAt(address account, uint256 position) external view returns (bytes32)',
];

export interface StorageSlot {
  slot: number;
  value: string;
  isEmpty: boolean;
}

export interface ContractStateInfo {
  address: string;
  codeSize: number;
  storageSlots: StorageSlot[];
  nonEmptySlots: number;
  totalSlotsChecked: number;
  storageDensity: number; // percentage of non-empty slots
}

export interface StateGrowthSnapshot {
  blockNumber: number;
  timestamp: number;
  contractAddress: string;
  storageSize: number;
  codeSize: number;
  nonEmptySlots: number;
}

export interface StateGrowthAnalysis {
  contractAddress: string;
  snapshots: StateGrowthSnapshot[];
  growthRate: number; // slots per block
  totalGrowth: number;
  isGrowing: boolean;
  growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason: string;
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
 * Get contract code size in bytes
 */
export async function getContractCodeSize(
  address: string,
  provider: ethers.Provider
): Promise<number> {
  try {
    const code = await provider.getCode(address);
    if (!code || code === '0x') {
      return 0;
    }
    // Remove '0x' prefix and divide by 2 (each byte is 2 hex chars)
    return (code.length - 2) / 2;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if a storage slot is empty (all zeros)
 */
export function isEmptySlot(value: string): boolean {
  if (!value || value === '0x') {
    return true;
  }
  // Remove '0x' prefix and check if all zeros
  const hexValue = value.slice(2);
  return /^0+$/.test(hexValue);
}

/**
 * Read storage slots for a contract
 */
export async function readStorageSlots(
  contractAddress: string,
  provider: ethers.Provider,
  maxSlots: number = 100
): Promise<StorageSlot[]> {
  const slots: StorageSlot[] = [];
  
  try {
    // Read storage slots sequentially
    for (let i = 0; i < maxSlots; i++) {
      try {
        const value = await provider.getStorage(contractAddress, i);
        slots.push({
          slot: i,
          value: value,
          isEmpty: isEmptySlot(value)
        });
      } catch (error) {
        // If we can't read a slot, assume it's empty
        slots.push({
          slot: i,
          value: '0x0',
          isEmpty: true
        });
      }
    }
  } catch (error) {
    // Return what we have
  }
  
  return slots;
}

/**
 * Analyze contract state information
 */
export async function analyzeContractState(
  contractAddress: string,
  provider: ethers.Provider,
  maxSlots: number = 100
): Promise<ContractStateInfo> {
  const normalizedAddress = ethers.getAddress(contractAddress);
  
  const [codeSize, storageSlots] = await Promise.all([
    getContractCodeSize(normalizedAddress, provider),
    readStorageSlots(normalizedAddress, provider, maxSlots)
  ]);
  
  const nonEmptySlots = storageSlots.filter(s => !s.isEmpty).length;
  const storageDensity = storageSlots.length > 0 
    ? (nonEmptySlots / storageSlots.length) * 100 
    : 0;
  
  return {
    address: normalizedAddress,
    codeSize,
    storageSlots,
    nonEmptySlots,
    totalSlotsChecked: storageSlots.length,
    storageDensity
  };
}

/**
 * Create a snapshot of contract state at a specific block
 */
export async function createStateSnapshot(
  contractAddress: string,
  provider: ethers.Provider,
  blockNumber?: number,
  maxSlots: number = 100
): Promise<StateGrowthSnapshot> {
  const block = blockNumber ? await provider.getBlock(blockNumber) : await provider.getBlock('latest');
  
  const stateInfo = await analyzeContractState(contractAddress, provider, maxSlots);
  
  return {
    blockNumber: blockNumber || block!.number,
    timestamp: block!.timestamp,
    contractAddress: ethers.getAddress(contractAddress),
    storageSize: stateInfo.totalSlotsChecked,
    codeSize: stateInfo.codeSize,
    nonEmptySlots: stateInfo.nonEmptySlots
  };
}

/**
 * Analyze state growth over multiple blocks
 */
export async function analyzeStateGrowth(
  contractAddress: string,
  provider: ethers.Provider,
  startBlock: number,
  endBlock: number,
  interval: number = 1000, // blocks between snapshots
  maxSlots: number = 100
): Promise<StateGrowthAnalysis> {
  const snapshots: StateGrowthSnapshot[] = [];
  const normalizedAddress = ethers.getAddress(contractAddress);
  
  // Create snapshots at intervals
  for (let block = startBlock; block <= endBlock; block += interval) {
    try {
      const snapshot = await createStateSnapshot(normalizedAddress, provider, block, maxSlots);
      snapshots.push(snapshot);
    } catch (error) {
      // Skip blocks that fail
      continue;
    }
  }
  
  // Add latest block snapshot
  if (snapshots.length === 0 || snapshots[snapshots.length - 1].blockNumber < endBlock) {
    try {
      const latestSnapshot = await createStateSnapshot(normalizedAddress, provider, endBlock, maxSlots);
      snapshots.push(latestSnapshot);
    } catch (error) {
      // Continue without latest
    }
  }
  
  // Calculate growth metrics
  if (snapshots.length < 2) {
    return {
      contractAddress: normalizedAddress,
      snapshots,
      growthRate: 0,
      totalGrowth: 0,
      isGrowing: false,
      growthTrend: 'STABLE',
      riskLevel: 'LOW',
      riskReason: 'Insufficient data to analyze growth'
    };
  }
  
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const totalGrowth = lastSnapshot.nonEmptySlots - firstSnapshot.nonEmptySlots;
  const blockRange = lastSnapshot.blockNumber - firstSnapshot.blockNumber;
  const growthRate = blockRange > 0 ? totalGrowth / blockRange : 0;
  const isGrowing = totalGrowth > 0;
  
  // Determine trend
  let growthTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
  if (snapshots.length >= 3) {
    const midPoint = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots[midPoint].nonEmptySlots - snapshots[0].nonEmptySlots;
    const secondHalf = snapshots[snapshots.length - 1].nonEmptySlots - snapshots[midPoint].nonEmptySlots;
    
    if (secondHalf > firstHalf * 1.1) {
      growthTrend = 'INCREASING';
    } else if (secondHalf < firstHalf * 0.9) {
      growthTrend = 'DECREASING';
    }
  } else if (totalGrowth > 0) {
    growthTrend = 'INCREASING';
  } else if (totalGrowth < 0) {
    growthTrend = 'DECREASING';
  }
  
  // Calculate risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let riskReason = 'State growth appears normal';
  
  if (growthRate > 0.1) { // More than 0.1 slots per block
    riskLevel = 'HIGH';
    riskReason = `Rapid state growth detected: ${growthRate.toFixed(4)} slots per block. This may indicate state bloat.`;
  } else if (growthRate > 0.01) {
    riskLevel = 'MEDIUM';
    riskReason = `Moderate state growth: ${growthRate.toFixed(4)} slots per block. Monitor for potential bloat.`;
  } else if (totalGrowth > 50) {
    riskLevel = 'MEDIUM';
    riskReason = `Significant total growth: ${totalGrowth} slots over analyzed period.`;
  }
  
  return {
    contractAddress: normalizedAddress,
    snapshots,
    growthRate,
    totalGrowth,
    isGrowing,
    growthTrend,
    riskLevel,
    riskReason
  };
}

/**
 * Compare state between two contracts
 */
export async function compareContractStates(
  contract1: string,
  contract2: string,
  provider: ethers.Provider,
  maxSlots: number = 100
): Promise<{
  contract1: ContractStateInfo;
  contract2: ContractStateInfo;
  difference: {
    codeSizeDiff: number;
    storageDiff: number;
    densityDiff: number;
  };
}> {
  const [state1, state2] = await Promise.all([
    analyzeContractState(contract1, provider, maxSlots),
    analyzeContractState(contract2, provider, maxSlots)
  ]);
  
  return {
    contract1: state1,
    contract2: state2,
    difference: {
      codeSizeDiff: state1.codeSize - state2.codeSize,
      storageDiff: state1.nonEmptySlots - state2.nonEmptySlots,
      densityDiff: state1.storageDensity - state2.storageDensity
    }
  };
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.error('Usage: npm start <contract-address> [start-block] [end-block]');
    process.exit(1);
  }
  
  const provider = getBSCProvider();
  
  // Check if it's a contract
  const isContractAddress = await isContract(contractAddress, provider);
  if (!isContractAddress) {
    console.error('Error: Address is not a contract');
    process.exit(1);
  }
  
  const startBlock = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  const endBlock = process.argv[4] ? parseInt(process.argv[4]) : undefined;
  
  if (startBlock && endBlock) {
    // Analyze growth over block range
    console.log(`Analyzing state growth from block ${startBlock} to ${endBlock}...`);
    const analysis = await analyzeStateGrowth(contractAddress, provider, startBlock, endBlock);
    
    console.log(`\nState Growth Analysis for ${contractAddress}`);
    console.log(`Growth Rate: ${analysis.growthRate.toFixed(4)} slots per block`);
    console.log(`Total Growth: ${analysis.totalGrowth} slots`);
    console.log(`Trend: ${analysis.growthTrend}`);
    console.log(`Risk Level: ${analysis.riskLevel}`);
    console.log(`Risk Reason: ${analysis.riskReason}`);
    console.log(`\nSnapshots: ${analysis.snapshots.length}`);
  } else {
    // Single snapshot
    console.log(`Analyzing contract state for ${contractAddress}...`);
    const stateInfo = await analyzeContractState(contractAddress, provider);
    
    console.log(`\nContract State Information`);
    console.log(`Address: ${stateInfo.address}`);
    console.log(`Code Size: ${stateInfo.codeSize} bytes`);
    console.log(`Non-empty Storage Slots: ${stateInfo.nonEmptySlots} / ${stateInfo.totalSlotsChecked}`);
    console.log(`Storage Density: ${stateInfo.storageDensity.toFixed(2)}%`);
  }
}

// Express server for web UI
export function createServer(): express.Application {
  const app = express();
  app.use(express.json());
  
  // Serve static files from root directory
  app.use(express.static(process.cwd()));
  
  // API endpoint to analyze contract state
  app.post('/api/analyze', async (req, res) => {
    try {
      const { contractAddress, maxSlots } = req.body;
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      const provider = getBSCProvider();
      const stateInfo = await analyzeContractState(
        contractAddress,
        provider,
        maxSlots || 100
      );
      
      res.json(stateInfo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // API endpoint to analyze state growth
  app.post('/api/growth', async (req, res) => {
    try {
      const { contractAddress, startBlock, endBlock, interval, maxSlots } = req.body;
      if (!contractAddress || !startBlock || !endBlock) {
        return res.status(400).json({ 
          error: 'Contract address, start block, and end block are required' 
        });
      }
      
      const provider = getBSCProvider();
      const analysis = await analyzeStateGrowth(
        contractAddress,
        provider,
        parseInt(startBlock),
        parseInt(endBlock),
        interval || 1000,
        maxSlots || 100
      );
      
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // API endpoint to compare contracts
  app.post('/api/compare', async (req, res) => {
    try {
      const { contract1, contract2, maxSlots } = req.body;
      if (!contract1 || !contract2) {
        return res.status(400).json({ error: 'Both contract addresses are required' });
      }
      
      const provider = getBSCProvider();
      const comparison = await compareContractStates(
        contract1,
        contract2,
        provider,
        maxSlots || 100
      );
      
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return app;
}

// Run server or CLI if executed directly
if (require.main === module) {
  // Check if CLI arguments are provided (CLI mode)
  if (process.argv.length > 2 && process.argv[2] !== 'server') {
    // CLI mode
    main().catch(console.error);
  } else {
    // Server mode
    const port = process.env.PORT || 3000;
    const server = createServer();
    
    server.listen(port, () => {
      console.log(`State Growth Inspector running on http://localhost:${port}`);
      console.log('Open the browser to view the UI');
    });
  }
}


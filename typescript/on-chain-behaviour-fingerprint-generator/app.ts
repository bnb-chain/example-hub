import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
import { startServer } from './server';

dotenv.config();

// Common DEX router addresses on BSC
const COMMON_DEX_ROUTERS = [
  '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router V2
  '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', // PancakeSwap Router V3
  '0x11111112542D85B3EF69AE05771c2dCCff4fAa26', // 1inch Router
  '0x05fF2B0DB69458A0750badebc4f9e13AdD608C7F', // PancakeSwap Router V1
];

// ERC-20 Transfer event signature
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface TransactionPattern {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: bigint;
  gasUsed: bigint;
  gasPrice: bigint;
  isContractCreation: boolean;
  isTokenTransfer: boolean;
  tokenAddress?: string;
}

export interface BehaviorMetrics {
  totalTransactions: number;
  uniqueContracts: Set<string>;
  uniqueTokens: Set<string>;
  totalValueTransferred: bigint;
  averageGasUsed: bigint;
  averageGasPrice: bigint;
  transactionFrequency: number; // transactions per day
  activeHours: Set<number>; // UTC hours when transactions occur
  activeDays: Set<number>; // Day of week (0-6, Sunday-Saturday)
  dexInteractions: number;
  contractCreations: number;
  tokenTransfers: number;
  averageTransactionValue: bigint;
  timeSpan: number; // days
}

export interface BehaviorFingerprint {
  address: string;
  metrics: BehaviorMetrics;
  fingerprint: string; // SHA-256 hash of behavioral signature
  signature: string; // Human-readable signature
  riskScore: number; // 0-100, higher = more suspicious
  behaviorType: 'NORMAL' | 'BOT' | 'DEX_TRADER' | 'WHALE' | 'CONTRACT_INTERACTOR' | 'UNKNOWN';
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
 * Fetch transactions for an address
 */
export async function fetchTransactions(
  address: string,
  provider: ethers.Provider,
  blockRange: number = 10000
): Promise<TransactionPattern[]> {
  const normalizedAddress = ethers.getAddress(address);
  const latestBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, latestBlock - blockRange);
  
  const transactions: TransactionPattern[] = [];
  const processedHashes = new Set<string>();

  // Fetch sent transactions
  for (let i = latestBlock; i >= startBlock; i -= 1000) {
    try {
      const block = await provider.getBlock(i, true);
      if (!block || !block.transactions) continue;

      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        
        // TypeScript type narrowing: after the string check, tx is TransactionResponse
        const txResponse = tx as ethers.TransactionResponse;
        const txHash = txResponse.hash;
        if (processedHashes.has(txHash)) continue;
        
        if (txResponse.from?.toLowerCase() === normalizedAddress.toLowerCase()) {
          const receipt = await provider.getTransactionReceipt(txHash).catch(() => null);
          
          transactions.push({
            hash: txHash,
            timestamp: block.timestamp,
            from: txResponse.from,
            to: txResponse.to || '',
            value: txResponse.value || 0n,
            gasUsed: receipt?.gasUsed || 0n,
            gasPrice: txResponse.gasPrice || 0n,
            isContractCreation: !txResponse.to,
            isTokenTransfer: false,
          });
          
          processedHashes.add(txHash);
        }
      }
    } catch (error) {
      // Continue on error
      continue;
    }
  }

  // Fetch token transfer events
  try {
    // Pad address to 32 bytes for topic filter
    const addressTopic = ethers.zeroPadValue(normalizedAddress, 32);
    const transferFilter = {
      fromBlock: startBlock,
      toBlock: latestBlock,
      topics: [
        TRANSFER_EVENT_TOPIC,
        addressTopic, // from address
      ],
    };

    const logs = await provider.getLogs(transferFilter).catch(() => []);
    
    for (const log of logs) {
      if (processedHashes.has(log.transactionHash)) continue;
      
      try {
        const tx = await provider.getTransaction(log.transactionHash);
        const receipt = await provider.getTransactionReceipt(log.transactionHash);
        if (!receipt) continue;
        
        const block = await provider.getBlock(receipt.blockNumber);
        
        transactions.push({
          hash: log.transactionHash,
          timestamp: block?.timestamp || 0,
          from: normalizedAddress,
          to: ethers.getAddress('0x' + log.topics[2].slice(26)),
          value: 0n,
          gasUsed: receipt?.gasUsed || 0n,
          gasPrice: tx?.gasPrice || 0n,
          isContractCreation: false,
          isTokenTransfer: true,
          tokenAddress: log.address,
        });
        
        processedHashes.add(log.transactionHash);
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    // Continue if event fetching fails
  }

  // Sort by timestamp (newest first)
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Calculate behavior metrics from transactions
 */
export function calculateBehaviorMetrics(
  transactions: TransactionPattern[],
  address: string
): BehaviorMetrics {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      uniqueContracts: new Set(),
      uniqueTokens: new Set(),
      totalValueTransferred: 0n,
      averageGasUsed: 0n,
      averageGasPrice: 0n,
      transactionFrequency: 0,
      activeHours: new Set(),
      activeDays: new Set(),
      dexInteractions: 0,
      contractCreations: 0,
      tokenTransfers: 0,
      averageTransactionValue: 0n,
      timeSpan: 0,
    };
  }

  const uniqueContracts = new Set<string>();
  const uniqueTokens = new Set<string>();
  let totalValue = 0n;
  let totalGasUsed = 0n;
  let totalGasPrice = 0n;
  const activeHours = new Set<number>();
  const activeDays = new Set<number>();
  let dexInteractions = 0;
  let contractCreations = 0;
  let tokenTransfers = 0;

  const timestamps = transactions.map(tx => tx.timestamp);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const timeSpan = (maxTimestamp - minTimestamp) / (24 * 60 * 60); // days

  for (const tx of transactions) {
    if (tx.to) {
      uniqueContracts.add(tx.to.toLowerCase());
      
      // Check if it's a DEX router
      if (COMMON_DEX_ROUTERS.some(router => router.toLowerCase() === tx.to.toLowerCase())) {
        dexInteractions++;
      }
    }

    if (tx.isTokenTransfer && tx.tokenAddress) {
      uniqueTokens.add(tx.tokenAddress.toLowerCase());
      tokenTransfers++;
    }

    if (tx.isContractCreation) {
      contractCreations++;
    }

    totalValue += tx.value;
    totalGasUsed += tx.gasUsed;
    totalGasPrice += tx.gasPrice;

    // Extract hour and day from timestamp
    const date = new Date(tx.timestamp * 1000);
    activeHours.add(date.getUTCHours());
    activeDays.add(date.getUTCDay());
  }

  const avgGasUsed = transactions.length > 0 ? totalGasUsed / BigInt(transactions.length) : 0n;
  const avgGasPrice = transactions.length > 0 ? totalGasPrice / BigInt(transactions.length) : 0n;
  const avgTxValue = transactions.length > 0 ? totalValue / BigInt(transactions.length) : 0n;
  const frequency = timeSpan > 0 ? transactions.length / timeSpan : 0;

  return {
    totalTransactions: transactions.length,
    uniqueContracts,
    uniqueTokens,
    totalValueTransferred: totalValue,
    averageGasUsed: avgGasUsed,
    averageGasPrice: avgGasPrice,
    transactionFrequency: frequency,
    activeHours,
    activeDays,
    dexInteractions,
    contractCreations,
    tokenTransfers,
    averageTransactionValue: avgTxValue,
    timeSpan: timeSpan || 1,
  };
}

/**
 * Classify behavior type based on metrics
 */
export function classifyBehaviorType(metrics: BehaviorMetrics): BehaviorFingerprint['behaviorType'] {
  // If no transactions, return UNKNOWN
  if (metrics.totalTransactions === 0) {
    return 'UNKNOWN';
  }

  // High frequency, low value = likely bot
  // Adjusted threshold: frequency > 30 (instead of 50) and value < 0.001 BNB (1e15 wei)
  if (metrics.transactionFrequency > 30 && Number(metrics.averageTransactionValue) < 1e15) {
    return 'BOT';
  }

  // High DEX interactions = DEX trader
  // Lower threshold: > 20% of transactions (instead of 30%)
  if (metrics.totalTransactions > 0 && metrics.dexInteractions > metrics.totalTransactions * 0.2) {
    return 'DEX_TRADER';
  }

  // High value transfers = whale
  // Lower threshold: > 50 BNB average (1e19 wei instead of 1e20)
  if (Number(metrics.averageTransactionValue) > 1e19) {
    return 'WHALE';
  }

  // Many contract interactions = contract interactor
  // Lower threshold: > 10 unique contracts (instead of 20)
  if (metrics.uniqueContracts.size > 10 && metrics.contractCreations > 0) {
    return 'CONTRACT_INTERACTOR';
  }

  // If has token transfers but not enough for other categories
  if (metrics.tokenTransfers > metrics.totalTransactions * 0.5) {
    return 'NORMAL';
  }

  // Default to normal for any address with transactions
  return 'NORMAL';
}

/**
 * Calculate risk score (0-100)
 */
export function calculateRiskScore(metrics: BehaviorMetrics, behaviorType: BehaviorFingerprint['behaviorType']): number {
  let score = 0;

  // High transaction frequency can indicate bot activity
  if (metrics.transactionFrequency > 100) score += 20;
  else if (metrics.transactionFrequency > 50) score += 10;

  // Many contract creations might indicate suspicious activity
  if (metrics.contractCreations > 5) score += 15;

  // Very high or very low gas prices might indicate automation
  const avgGasPriceGwei = Number(metrics.averageGasPrice) / 1e9;
  if (avgGasPriceGwei > 10 || avgGasPriceGwei < 1) score += 10;

  // Irregular activity patterns
  if (metrics.activeHours.size < 3 && metrics.totalTransactions > 10) score += 15;

  // Behavior type adjustments
  if (behaviorType === 'BOT') score += 25;
  if (behaviorType === 'UNKNOWN' && metrics.totalTransactions === 0) score += 30;

  return Math.min(100, score);
}

/**
 * Generate behavioral signature string
 */
export function generateSignature(metrics: BehaviorMetrics, behaviorType: BehaviorFingerprint['behaviorType']): string {
  const parts = [
    `TX:${metrics.totalTransactions}`,
    `FREQ:${metrics.transactionFrequency.toFixed(2)}`,
    `CONTRACTS:${metrics.uniqueContracts.size}`,
    `TOKENS:${metrics.uniqueTokens.size}`,
    `DEX:${metrics.dexInteractions}`,
    `TYPE:${behaviorType}`,
    `HOURS:${Array.from(metrics.activeHours).sort().join(',')}`,
    `DAYS:${Array.from(metrics.activeDays).sort().join(',')}`,
  ];
  return parts.join('|');
}

/**
 * Generate fingerprint hash from signature
 */
export function generateFingerprint(signature: string): string {
  return createHash('sha256').update(signature).digest('hex');
}

/**
 * Generate complete behavior fingerprint for an address
 */
export async function generateBehaviorFingerprint(
  address: string,
  blockRange: number = 10000
): Promise<BehaviorFingerprint> {
  const provider = getBSCProvider();
  const normalizedAddress = ethers.getAddress(address);

  // Fetch transactions
  const transactions = await fetchTransactions(normalizedAddress, provider, blockRange);

  // Calculate metrics
  const metrics = calculateBehaviorMetrics(transactions, normalizedAddress);

  // Classify behavior
  const behaviorType = classifyBehaviorType(metrics);

  // Calculate risk score
  const riskScore = calculateRiskScore(metrics, behaviorType);

  // Generate signature and fingerprint
  const signature = generateSignature(metrics, behaviorType);
  const fingerprint = generateFingerprint(signature);

  return {
    address: normalizedAddress,
    metrics,
    fingerprint,
    signature,
    riskScore,
    behaviorType,
  };
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const address = process.env.ADDRESS || process.argv[2];
  const blockRange = parseInt(process.env.BLOCK_RANGE || process.argv[3] || '10000', 10);

  if (!address) {
    console.error('Usage: npm run cli [address] [block-range]');
    console.error('Or set ADDRESS and optionally BLOCK_RANGE in .env file');
    console.error('Note: Use "npm start" to launch the web UI');
    process.exit(1);
  }

  console.log(`Generating behavior fingerprint for: ${address}`);
  console.log(`Analyzing last ${blockRange} blocks...\n`);

  try {
    const result = await generateBehaviorFingerprint(address, blockRange);

    console.log('Behavior Fingerprint:');
    console.log('='.repeat(60));
    console.log(`Address: ${result.address}`);
    console.log(`Fingerprint: ${result.fingerprint}`);
    console.log(`Behavior Type: ${result.behaviorType}`);
    console.log(`Risk Score: ${result.riskScore}/100`);
    console.log(`\nMetrics:`);
    console.log(`  Total Transactions: ${result.metrics.totalTransactions}`);
    console.log(`  Transaction Frequency: ${result.metrics.transactionFrequency.toFixed(2)} tx/day`);
    console.log(`  Unique Contracts: ${result.metrics.uniqueContracts.size}`);
    console.log(`  Unique Tokens: ${result.metrics.uniqueTokens.size}`);
    console.log(`  DEX Interactions: ${result.metrics.dexInteractions}`);
    console.log(`  Token Transfers: ${result.metrics.tokenTransfers}`);
    console.log(`  Contract Creations: ${result.metrics.contractCreations}`);
    console.log(`  Time Span: ${result.metrics.timeSpan.toFixed(2)} days`);
    console.log(`  Active Hours: ${Array.from(result.metrics.activeHours).sort().join(', ')}`);
    console.log(`  Active Days: ${Array.from(result.metrics.activeDays).sort().join(', ')}`);
    console.log(`\nSignature: ${result.signature}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  // Always start the UI server when running npm start
  const port = parseInt(process.env.PORT || '3000');
  startServer(port);
}


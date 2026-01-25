import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';

dotenv.config();

// ERC-20 and common contract ABIs
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

export interface GasInefficiency {
  type: 'STORAGE' | 'COMPUTATION' | 'LOOP' | 'EXTERNAL_CALL' | 'MEMORY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
  estimatedGasSavings: number;
  location?: string;
}

export interface TransactionAnalysis {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  gasUsed: bigint;
  gasPrice: bigint;
  totalCost: bigint;
  inefficiencies: GasInefficiency[];
  efficiencyScore: number; // 0-100
  recommendations: string[];
}

/**
 * Get provider for BSC network
 */
export function getBSCProvider(): ethers.Provider {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Analyze a transaction for gas inefficiencies
 */
export async function analyzeTransaction(txHash: string): Promise<TransactionAnalysis> {
  const provider = getBSCProvider();
  
  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error('Transaction receipt not found');
  }

  // Get transaction details
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error('Transaction not found');
  }

  const gasUsed = receipt.gasUsed;
  const gasPrice = tx.gasPrice || 0n;
  const totalCost = gasUsed * gasPrice;

  const inefficiencies: GasInefficiency[] = [];
  const recommendations: string[] = [];

  // Analyze gas usage patterns
  await analyzeGasPatterns(tx, receipt, provider, inefficiencies, recommendations);

  // Calculate efficiency score (0-100, higher is better)
  const efficiencyScore = calculateEfficiencyScore(gasUsed, inefficiencies);

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    from: tx.from,
    to: tx.to,
    gasUsed,
    gasPrice,
    totalCost,
    inefficiencies,
    efficiencyScore,
    recommendations
  };
}

/**
 * Analyze gas usage patterns
 */
async function analyzeGasPatterns(
  tx: ethers.TransactionResponse,
  receipt: ethers.TransactionReceipt,
  provider: ethers.Provider,
  inefficiencies: GasInefficiency[],
  recommendations: string[]
): Promise<void> {
  // 1. Check for high gas usage (potential inefficiency indicator)
  if (receipt.gasUsed > 500000n) {
    inefficiencies.push({
      type: 'OTHER',
      severity: 'MEDIUM',
      description: `Transaction used ${receipt.gasUsed.toString()} gas, which is relatively high.`,
      recommendation: 'Review transaction logic for optimization opportunities. Consider batching operations or using more gas-efficient patterns.',
      estimatedGasSavings: 0 // Unknown without deeper analysis
    });
  }

  // 2. Check for contract creation (expensive)
  if (receipt.contractAddress) {
    inefficiencies.push({
      type: 'STORAGE',
      severity: 'LOW',
      description: 'Transaction created a new contract, which is inherently expensive.',
      recommendation: 'If possible, use factory patterns or proxy contracts to reduce deployment costs.',
      estimatedGasSavings: 0
    });
  }

  // 3. Analyze logs for patterns
  if (receipt.logs.length > 20) {
    inefficiencies.push({
      type: 'STORAGE',
      severity: 'MEDIUM',
      description: `Transaction emitted ${receipt.logs.length} events, which can be gas-intensive.`,
      recommendation: 'Consider batching events or using indexed parameters more efficiently. Reduce unnecessary event emissions.',
      estimatedGasSavings: receipt.logs.length * 375 // ~375 gas per log
    });
  }

  // 4. Check for zero-value transfers (unnecessary gas)
  if (tx.value === 0n && tx.data && tx.data.length > 0) {
    // This is a contract call, check if it could be optimized
    const dataLength = tx.data.length;
    if (dataLength > 200) {
      inefficiencies.push({
        type: 'COMPUTATION',
        severity: 'LOW',
        description: `Transaction data is ${dataLength} bytes, which may indicate complex operations.`,
        recommendation: 'Review if all parameters are necessary. Consider using structs or more efficient encoding.',
        estimatedGasSavings: 0
      });
    }
  }

  // 5. Analyze transaction status
  if (!receipt.status) {
    inefficiencies.push({
      type: 'OTHER',
      severity: 'CRITICAL',
      description: 'Transaction failed, wasting all gas used.',
      recommendation: 'Implement proper error handling and validation before executing transactions. Use require/revert with descriptive messages.',
      estimatedGasSavings: Number(receipt.gasUsed)
    });
  }

  // 6. Check for common inefficient patterns based on gas usage
  if (receipt.gasUsed > 100000n && receipt.gasUsed < 200000n) {
    // Typical range for simple token transfers or basic operations
    // If it's higher, might indicate inefficiency
    if (tx.to && tx.data && tx.data.length < 100) {
      inefficiencies.push({
        type: 'COMPUTATION',
        severity: 'LOW',
        description: 'Gas usage seems high for a simple operation.',
        recommendation: 'Review contract code for unnecessary computations or storage operations.',
        estimatedGasSavings: 10000
      });
    }
  }

  // 7. Check for high gas price (user inefficiency, not contract)
  const currentBlock = await provider.getBlock('latest');
  if (currentBlock && currentBlock.baseFeePerGas) {
    const baseFee = currentBlock.baseFeePerGas;
    if (tx.maxFeePerGas && tx.maxFeePerGas > baseFee * 2n) {
      inefficiencies.push({
        type: 'OTHER',
        severity: 'LOW',
        description: `Gas price (${ethers.formatUnits(tx.maxFeePerGas, 'gwei')} gwei) is significantly higher than base fee.`,
        recommendation: 'Consider using a more conservative gas price to save on transaction costs.',
        estimatedGasSavings: 0
      });
    }
  }

  // 8. Analyze if transaction interacts with known contracts
  if (tx.to) {
    const code = await provider.getCode(tx.to);
    if (code && code !== '0x') {
      // It's a contract call
      // Check if multiple external calls could be batched
      if (receipt.logs.length > 5) {
        inefficiencies.push({
          type: 'EXTERNAL_CALL',
          severity: 'MEDIUM',
          description: 'Transaction involves multiple contract interactions.',
          recommendation: 'Consider batching multiple operations into a single transaction when possible.',
          estimatedGasSavings: 21000 * (receipt.logs.length - 1) // Approximate savings
        });
      }
    }
  }

  // Generate recommendations
  if (inefficiencies.length > 0) {
    recommendations.push('Review all identified inefficiencies and prioritize high-severity issues.');
  }
  
  if (receipt.gasUsed > 300000n) {
    recommendations.push('Consider breaking down complex transactions into smaller, more efficient operations.');
  }

  if (inefficiencies.some(i => i.type === 'STORAGE')) {
    recommendations.push('Optimize storage operations by using packed structs, storage slots efficiently, and minimizing state changes.');
  }

  if (inefficiencies.some(i => i.type === 'LOOP')) {
    recommendations.push('Review loops for unbounded iterations. Consider pagination or limiting loop sizes.');
  }
}

/**
 * Calculate efficiency score based on gas usage and inefficiencies
 */
function calculateEfficiencyScore(gasUsed: bigint, inefficiencies: GasInefficiency[]): number {
  let score = 100;

  // Deduct points for high gas usage
  if (gasUsed > 1000000n) {
    score -= 30;
  } else if (gasUsed > 500000n) {
    score -= 20;
  } else if (gasUsed > 200000n) {
    score -= 10;
  }

  // Deduct points for inefficiencies
  for (const inefficiency of inefficiencies) {
    switch (inefficiency.severity) {
      case 'CRITICAL':
        score -= 20;
        break;
      case 'HIGH':
        score -= 15;
        break;
      case 'MEDIUM':
        score -= 10;
        break;
      case 'LOW':
        score -= 5;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze multiple transactions and provide aggregate insights
 */
export async function analyzeMultipleTransactions(txHashes: string[]): Promise<{
  analyses: TransactionAnalysis[];
  aggregate: {
    totalGasUsed: bigint;
    averageGasUsed: bigint;
    averageEfficiencyScore: number;
    totalInefficiencies: number;
    mostCommonIssues: { type: string; count: number }[];
  };
}> {
  const analyses: TransactionAnalysis[] = [];

  for (const txHash of txHashes) {
    try {
      const analysis = await analyzeTransaction(txHash);
      analyses.push(analysis);
    } catch (error) {
      console.error(`Failed to analyze transaction ${txHash}:`, error);
    }
  }

  const totalGasUsed = analyses.reduce((sum, a) => sum + a.gasUsed, 0n);
  const averageGasUsed = analyses.length > 0 ? totalGasUsed / BigInt(analyses.length) : 0n;
  const averageEfficiencyScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.efficiencyScore, 0) / analyses.length
    : 0;

  // Count inefficiency types
  const issueCounts: Record<string, number> = {};
  analyses.forEach(a => {
    a.inefficiencies.forEach(i => {
      issueCounts[i.type] = (issueCounts[i.type] || 0) + 1;
    });
  });

  const mostCommonIssues = Object.entries(issueCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    analyses,
    aggregate: {
      totalGasUsed,
      averageGasUsed,
      averageEfficiencyScore,
      totalInefficiencies: analyses.reduce((sum, a) => sum + a.inefficiencies.length, 0),
      mostCommonIssues
    }
  };
}

/**
 * Convert BigInt values to strings for JSON serialization
 */
function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInts(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInts(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const txHash = process.env.TX_HASH || process.argv[2];
  
  if (!txHash) {
    console.error('Usage: npm start [transaction-hash]');
    console.error('Or set TX_HASH in .env file');
    console.error('Or run without arguments to start the web server');
    process.exit(1);
  }

  console.log(`Analyzing transaction: ${txHash}`);
  
  try {
    const analysis = await analyzeTransaction(txHash);
    
    console.log(`\n=== Transaction Analysis ===`);
    console.log(`Block: ${analysis.blockNumber}`);
    console.log(`From: ${analysis.from}`);
    console.log(`To: ${analysis.to || 'Contract Creation'}`);
    console.log(`Gas Used: ${analysis.gasUsed.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(analysis.gasPrice, 'gwei')} gwei`);
    console.log(`Total Cost: ${ethers.formatEther(analysis.totalCost)} BNB`);
    console.log(`Efficiency Score: ${analysis.efficiencyScore.toFixed(1)}/100`);
    
    console.log(`\n=== Inefficiencies Found: ${analysis.inefficiencies.length} ===`);
    analysis.inefficiencies.forEach((ineff, idx) => {
      console.log(`\n${idx + 1}. [${ineff.severity}] ${ineff.type}`);
      console.log(`   Description: ${ineff.description}`);
      console.log(`   Recommendation: ${ineff.recommendation}`);
      if (ineff.estimatedGasSavings > 0) {
        console.log(`   Estimated Savings: ~${ineff.estimatedGasSavings} gas`);
      }
    });

    if (analysis.recommendations.length > 0) {
      console.log(`\n=== Recommendations ===`);
      analysis.recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec}`);
      });
    }
  } catch (error) {
    console.error('Error analyzing transaction:', error);
    process.exit(1);
  }
}

// Express server for UI
export function startServer(port: number = 3000) {
  const app = express();
  
  app.use(express.json());
  
  // Serve static files from the project root
  const projectRoot = process.cwd();
  app.use(express.static(projectRoot));

  app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { txHash } = req.body;
      if (!txHash) {
        return res.status(400).json({ error: 'Transaction hash is required' });
      }
      const analysis = await analyzeTransaction(txHash);
      // Serialize BigInt values to strings for JSON response
      const serialized = serializeBigInts(analysis);
      // Use res.json which will properly stringify the already-serialized object
      res.json(serialized);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to analyze transaction' });
    }
  });

  app.post('/api/analyze-multiple', async (req, res) => {
    try {
      const { txHashes } = req.body;
      if (!txHashes || !Array.isArray(txHashes)) {
        return res.status(400).json({ error: 'Array of transaction hashes is required' });
      }
      const result = await analyzeMultipleTransactions(txHashes);
      // Serialize BigInt values to strings for JSON response
      const serialized = serializeBigInts(result);
      // Use res.json which will properly stringify the already-serialized object
      res.json(serialized);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to analyze transactions' });
    }
  });

  app.listen(port, () => {
    console.log(`Gas Inefficiency Detector server running on http://localhost:${port}`);
  });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const txHash = process.env.TX_HASH || args[0];
  
  // If explicitly requesting server or no TX_HASH provided, start server
  if (args[0] === 'server' || (!txHash && args.length === 0)) {
    const port = parseInt(process.env.PORT || args[1] || '3000');
    startServer(port);
  } else if (txHash) {
    // If TX_HASH is set in env or provided as argument, run analysis
    main().catch(console.error);
  } else {
    // Fallback to server if no clear instruction
    const port = parseInt(process.env.PORT || '3000');
    startServer(port);
  }
}


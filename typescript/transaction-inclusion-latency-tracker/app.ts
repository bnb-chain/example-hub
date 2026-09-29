import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export interface TransactionLatencyResult {
  txHash: string;
  submittedAt: number;
  includedAt: number | null;
  latencyMs: number | null;
  blockNumber: number | null;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export interface LatencyStats {
  totalTransactions: number;
  confirmedTransactions: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  pendingCount: number;
}

/**
 * Get provider for BSC network
 */
export function getBSCProvider(): ethers.Provider {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Submit a transaction and track its inclusion latency
 */
export async function trackTransactionLatency(
  txHash: string,
  submittedAt: number
): Promise<TransactionLatencyResult> {
  const provider = getBSCProvider();
  const startTime = submittedAt || Date.now();

  try {
    // Wait for transaction to be mined
    const receipt = await provider.waitForTransaction(txHash, 1, 60000); // 60 second timeout
    
    if (!receipt) {
      return {
        txHash,
        submittedAt: startTime,
        includedAt: null,
        latencyMs: null,
        blockNumber: null,
        status: 'failed',
        error: 'Transaction not found or timeout'
      };
    }

    const includedAt = Date.now();
    const latencyMs = includedAt - startTime;

    return {
      txHash,
      submittedAt: startTime,
      includedAt,
      latencyMs,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'confirmed' : 'failed'
    };
  } catch (error: any) {
    return {
      txHash,
      submittedAt: startTime,
      includedAt: null,
      latencyMs: null,
      blockNumber: null,
      status: 'failed',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Monitor a transaction by hash and track its latency
 */
export async function monitorTransaction(txHash: string): Promise<TransactionLatencyResult> {
  const provider = getBSCProvider();
  const submittedAt = Date.now();

  try {
    // First check if transaction exists
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return {
        txHash,
        submittedAt,
        includedAt: null,
        latencyMs: null,
        blockNumber: null,
        status: 'failed',
        error: 'Transaction not found'
      };
    }

    // If already confirmed, calculate latency from block timestamp
    if (tx.blockNumber) {
      const block = await provider.getBlock(tx.blockNumber);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (block && receipt) {
        // Estimate submission time (block time - average block time)
        // For BSC, average block time is ~3 seconds
        const estimatedSubmittedAt = (block.timestamp * 1000) - 3000;
        const latencyMs = (block.timestamp * 1000) - estimatedSubmittedAt;

        return {
          txHash,
          submittedAt: estimatedSubmittedAt,
          includedAt: block.timestamp * 1000,
          latencyMs: latencyMs > 0 ? latencyMs : 3000, // Default to 3s if calculation is off
          blockNumber: receipt.blockNumber,
          status: receipt.status === 1 ? 'confirmed' : 'failed'
        };
      }
    }

    // If pending, wait for confirmation
    return await trackTransactionLatency(txHash, submittedAt);
  } catch (error: any) {
    return {
      txHash,
      submittedAt,
      includedAt: null,
      latencyMs: null,
      blockNumber: null,
      status: 'failed',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Calculate statistics from multiple transaction results
 */
export function calculateLatencyStats(results: TransactionLatencyResult[]): LatencyStats {
  const confirmed = results.filter(r => r.status === 'confirmed' && r.latencyMs !== null);
  const pending = results.filter(r => r.status === 'pending');
  
  if (confirmed.length === 0) {
    return {
      totalTransactions: results.length,
      confirmedTransactions: 0,
      averageLatencyMs: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      pendingCount: pending.length
    };
  }

  const latencies = confirmed.map(r => r.latencyMs!).filter(l => l !== null);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);

  return {
    totalTransactions: results.length,
    confirmedTransactions: confirmed.length,
    averageLatencyMs: Math.round(avg),
    minLatencyMs: min,
    maxLatencyMs: max,
    pendingCount: pending.length
  };
}

/**
 * Send a test transaction to track latency
 */
export async function sendTestTransaction(
  wallet: ethers.Wallet,
  toAddress?: string
): Promise<TransactionLatencyResult> {
  const provider = getBSCProvider();
  const connectedWallet = wallet.connect(provider);
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  if (!feeData.gasPrice) {
    throw new Error('Unable to fetch gas price');
  }

  // Send a minimal transaction (0 BNB to self or specified address)
  const targetAddress = toAddress || wallet.address;
  const submittedAt = Date.now();
  
  try {
    const tx = await connectedWallet.sendTransaction({
      to: targetAddress,
      value: 0,
      gasPrice: feeData.gasPrice
    });

    // Track the transaction
    return await trackTransactionLatency(tx.hash, submittedAt);
  } catch (error: any) {
    return {
      txHash: '',
      submittedAt,
      includedAt: null,
      latencyMs: null,
      blockNumber: null,
      status: 'failed',
      error: error.message || 'Transaction failed'
    };
  }
}

/**
 * Start HTTP server to serve the UI
 */
export function startServer(port: number = 3000): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/')) {
      // API endpoints
      handleAPI(req, res);
      return;
    }
    
    // Serve index.html for all routes (SPA)
    let filePath = path.join(__dirname, 'index.html');
    
    // If running from TypeScript source, adjust path
    if (__dirname.includes('node_modules') || !fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading file: ' + err.message);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  return server;
}

/**
 * Handle API requests
 */
async function handleAPI(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (pathname === '/api/monitor' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { txHash } = JSON.parse(body);
        if (!txHash) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'txHash is required' }));
          return;
        }

        const result = await monitorTransaction(txHash);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
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

  console.log(`Monitoring transaction: ${txHash}`);
  const result = await monitorTransaction(txHash);
  
  console.log('\nTransaction Latency Result:');
  console.log(`Status: ${result.status}`);
  if (result.latencyMs !== null) {
    console.log(`Latency: ${result.latencyMs}ms (${(result.latencyMs / 1000).toFixed(2)}s)`);
  }
  if (result.blockNumber) {
    console.log(`Block Number: ${result.blockNumber}`);
  }
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const txHash = process.env.TX_HASH || process.argv[2];
  
  // If no arguments and no env var, start server by default
  if (!txHash || process.argv[2] === '--server') {
    const port = parseInt(process.env.PORT || process.argv[3] || '3000');
    startServer(port);
  } else {
    // Update main to use env var
    process.argv[2] = txHash;
    main().catch(console.error);
  }
}


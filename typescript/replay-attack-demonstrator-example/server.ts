import express from 'express';
import path from 'path';
import * as net from 'net';
import { demonstrateReplayAttack, getTransactionDetails, NETWORKS } from './app';

const app = express();
const DESIRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Export startServer function for use in app.ts
export function startServer(desiredPort: number = 3000) {
  return findAvailablePort(desiredPort)
    .then((port) => {
      app.listen(port, () => {
        console.log(`Replay Attack Demonstrator server running at http://localhost:${port}`);
        console.log(`Open http://localhost:${port} in your browser to use the UI`);
        if (port !== desiredPort) {
          console.log(`Note: Port ${desiredPort} was in use, using port ${port} instead`);
        }
      });
    })
    .catch((err) => {
      console.error('Failed to find available port:', err);
      process.exit(1);
    });
}

/**
 * Find the next available port starting from the desired port
 */
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Middleware
app.use(express.json());
// Serve static files from the root directory (one level up from dist)
app.use(express.static(path.join(__dirname, '..')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API endpoint to demonstrate replay attack
app.post('/api/demonstrate', async (req, res) => {
  try {
    const { fromAddress, toAddress, value, originalNetwork, targetNetwork, privateKey } = req.body;

    if (!fromAddress || !toAddress || !value || !originalNetwork) {
      return res.status(400).json({ error: 'fromAddress, toAddress, value, and originalNetwork are required' });
    }

    const result = await demonstrateReplayAttack(
      fromAddress,
      toAddress,
      value,
      originalNetwork,
      targetNetwork || 'bsc-mainnet',
      privateKey
    );

    res.json(result);
  } catch (error) {
    console.error('Error demonstrating replay attack:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// API endpoint to get transaction details from signed transaction hex
app.post('/api/transaction-details', async (req, res) => {
  try {
    const { signedTxHex } = req.body;

    if (!signedTxHex) {
      return res.status(400).json({ error: 'signedTxHex is required' });
    }

    const result = getTransactionDetails(signedTxHex);
    
    // Convert BigInt to string for JSON serialization
    const response = {
      ...result,
      transaction: {
        ...result.transaction,
        value: result.value,
        chainId: result.chainId
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// API endpoint to get available networks
app.get('/api/networks', (req, res) => {
  const networks = Object.entries(NETWORKS).map(([key, network]) => ({
    key,
    name: network.name,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl
  }));
  res.json(networks);
});

// Auto-start server if this file is run directly
if (require.main === module) {
  startServer(DESIRED_PORT);
}

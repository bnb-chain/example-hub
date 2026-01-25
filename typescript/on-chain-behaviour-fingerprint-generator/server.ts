import express from 'express';
import path from 'path';
import * as net from 'net';
import { generateBehaviorFingerprint } from './app';

const app = express();
const DESIRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Export startServer function for use in app.ts
export function startServer(desiredPort: number = 3000) {
  return findAvailablePort(desiredPort)
    .then((port) => {
      app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
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

// API endpoint to generate fingerprint
app.post('/api/fingerprint', async (req, res) => {
  try {
    const { address, blockRange = 10000 } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await generateBehaviorFingerprint(address, blockRange);
    
    // Convert Sets to Arrays for JSON serialization
    const response = {
      ...result,
      metrics: {
        ...result.metrics,
        uniqueContracts: Array.from(result.metrics.uniqueContracts),
        uniqueTokens: Array.from(result.metrics.uniqueTokens),
        activeHours: Array.from(result.metrics.activeHours),
        activeDays: Array.from(result.metrics.activeDays),
        // Convert BigInt to string for JSON
        totalValueTransferred: result.metrics.totalValueTransferred.toString(),
        averageGasUsed: result.metrics.averageGasUsed.toString(),
        averageGasPrice: result.metrics.averageGasPrice.toString(),
        averageTransactionValue: result.metrics.averageTransactionValue.toString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Auto-start server if this file is run directly
if (require.main === module) {
  startServer(DESIRED_PORT);
}

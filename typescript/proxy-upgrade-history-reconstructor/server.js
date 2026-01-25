const express = require('express');
const cors = require('cors');
const path = require('path');
const net = require('net');
const { reconstructUpgradeHistory, scanAndSuggestProxies, getKnownProxies } = require('./dist/app');

const app = express();
const DESIRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * Find the next available port starting from the desired port
 */
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/reconstruct', async (req, res) => {
  try {
    const { address, fromBlock, toBlock } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Proxy address is required' });
    }

    const fromBlockNum = fromBlock ? parseInt(fromBlock) : undefined;
    const toBlockVal = toBlock 
      ? (toBlock === 'latest' ? 'latest' : parseInt(toBlock))
      : undefined;

    const history = await reconstructUpgradeHistory(address, fromBlockNum, toBlockVal);
    
    res.json(history);
  } catch (error) {
    console.error('Error reconstructing upgrade history:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to reconstruct upgrade history' 
    });
  }
});

app.post('/api/scan-proxies', async (req, res) => {
  try {
    const { addresses, includeKnownProxies } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Addresses array is required' });
    }

    if (addresses.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 addresses allowed per scan' });
    }

    const result = await scanAndSuggestProxies(addresses, includeKnownProxies !== false);
    
    res.json(result);
  } catch (error) {
    console.error('Error scanning proxies:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to scan proxies' 
    });
  }
});

app.get('/api/known-proxies', (req, res) => {
  try {
    const proxies = getKnownProxies();
    res.json({ proxies });
  } catch (error) {
    console.error('Error getting known proxies:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get known proxies' 
    });
  }
});

// Find available port and start server
findAvailablePort(DESIRED_PORT)
  .then((port) => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Open http://localhost:${port} in your browser to use the UI`);
      if (port !== DESIRED_PORT) {
        console.log(`Note: Port ${DESIRED_PORT} was in use, using port ${port} instead`);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to find available port:', err);
    process.exit(1);
  });




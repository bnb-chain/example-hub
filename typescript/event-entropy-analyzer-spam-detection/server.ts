import express from 'express';
import { analyzeContractEvents, getBSCProvider } from './app';
import * as path from 'path';

// Get current directory (works in both CommonJS and ES modules)
const currentDir = __dirname || process.cwd();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(currentDir));

// API endpoint for event analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { contractAddress, eventType, fromBlock, toBlock } = req.body;

    if (!contractAddress) {
      return res.status(400).json({ error: 'Contract address is required' });
    }

    if (!fromBlock && fromBlock !== 0) {
      return res.status(400).json({ error: 'From block is required' });
    }

    const provider = getBSCProvider();
    let actualToBlock = toBlock;

    // If toBlock is not provided or is 'latest', get the latest block
    if (!toBlock || toBlock === 'latest') {
      const latestBlock = await provider.getBlockNumber();
      actualToBlock = latestBlock;
    }

    const result = await analyzeContractEvents(
      contractAddress,
      eventType || 'Transfer',
      parseInt(fromBlock),
      parseInt(actualToBlock),
      provider
    );

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(currentDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Event Entropy Analyzer server running on http://localhost:${PORT}`);
  console.log(`📊 Open your browser to view the UI`);
});


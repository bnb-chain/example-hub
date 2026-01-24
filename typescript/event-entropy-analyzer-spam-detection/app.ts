import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';

dotenv.config();

// Common ERC-20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';
const APPROVAL_EVENT_SIGNATURE = 'Approval(address,address,uint256)';

export interface EventData {
  blockNumber: number;
  transactionHash: string;
  from: string;
  to: string;
  value: string;
  eventName: string;
}

export interface EntropyAnalysis {
  entropy: number;
  uniqueAddresses: number;
  totalEvents: number;
  spamScore: number;
  spamLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  patterns: {
    repeatedFrom: number;
    repeatedTo: number;
    repeatedValue: number;
    sequentialBlocks: number;
  };
  recommendations: string[];
}

export interface AnalysisResult {
  contractAddress: string;
  eventType: string;
  blockRange: { from: number; to: number };
  events: EventData[];
  analysis: EntropyAnalysis;
}

/**
 * Get provider for BSC network
 */
export function getBSCProvider(): ethers.Provider {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Calculate Shannon entropy for a set of values
 * Higher entropy = more diversity = less spam
 * Lower entropy = less diversity = more spam
 */
export function calculateEntropy(values: string[]): number {
  if (values.length === 0) return 0;

  // Count frequency of each value
  const frequencyMap = new Map<string, number>();
  for (const value of values) {
    frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
  }

  // Calculate entropy using Shannon entropy formula
  let entropy = 0;
  const total = values.length;

  for (const count of frequencyMap.values()) {
    const probability = count / total;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }

  return entropy;
}

/**
 * Fetch events from a contract within a block range
 */
export async function fetchEvents(
  contractAddress: string,
  eventSignature: string,
  fromBlock: number,
  toBlock: number,
  provider?: ethers.Provider
): Promise<EventData[]> {
  const rpcProvider = provider || getBSCProvider();
  
  try {
    // Get the event topic
    const eventTopic = ethers.id(eventSignature);
    
    // Fetch logs
    const logs = await rpcProvider.getLogs({
      address: contractAddress,
      topics: [eventTopic],
      fromBlock,
      toBlock
    });

    const events: EventData[] = [];
    const iface = new ethers.Interface([`event ${eventSignature}`]);

    for (const log of logs) {
      try {
        const parsedLog = iface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });

        if (parsedLog) {
          const args = parsedLog.args as any[];
          
          // Handle Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
          if (eventSignature === TRANSFER_EVENT_SIGNATURE && args.length >= 3) {
            events.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              from: args[0]?.toString() || '',
              to: args[1]?.toString() || '',
              value: args[2]?.toString() || '0',
              eventName: 'Transfer'
            });
          }
          // Handle Approval event: Approval(address indexed owner, address indexed spender, uint256 value)
          else if (eventSignature === APPROVAL_EVENT_SIGNATURE && args.length >= 3) {
            events.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              from: args[0]?.toString() || '',
              to: args[1]?.toString() || '',
              value: args[2]?.toString() || '0',
              eventName: 'Approval'
            });
          }
        }
      } catch (error) {
        // Skip logs that can't be parsed
        continue;
      }
    }

    return events;
  } catch (error) {
    throw new Error(`Failed to fetch events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze patterns in events to detect spam indicators
 */
export function analyzePatterns(events: EventData[]): {
  repeatedFrom: number;
  repeatedTo: number;
  repeatedValue: number;
  sequentialBlocks: number;
} {
  if (events.length === 0) {
    return { repeatedFrom: 0, repeatedTo: 0, repeatedValue: 0, sequentialBlocks: 0 };
  }

  // Count repeated addresses
  const fromCount = new Map<string, number>();
  const toCount = new Map<string, number>();
  const valueCount = new Map<string, number>();
  const blockNumbers = events.map(e => e.blockNumber).sort((a, b) => a - b);

  for (const event of events) {
    fromCount.set(event.from, (fromCount.get(event.from) || 0) + 1);
    toCount.set(event.to, (toCount.get(event.to) || 0) + 1);
    valueCount.set(event.value, (valueCount.get(event.value) || 0) + 1);
  }

  // Calculate max repetition counts
  const repeatedFrom = Math.max(...Array.from(fromCount.values()));
  const repeatedTo = Math.max(...Array.from(toCount.values()));
  const repeatedValue = Math.max(...Array.from(valueCount.values()));

  // Count sequential blocks (spam often comes in sequential blocks)
  // Each block is at least a sequence of 1, so start with 1
  let sequentialBlocks = blockNumbers.length > 0 ? 1 : 0;
  let currentSequence = 1;
  for (let i = 1; i < blockNumbers.length; i++) {
    if (blockNumbers[i] === blockNumbers[i - 1] + 1) {
      currentSequence++;
      sequentialBlocks = Math.max(sequentialBlocks, currentSequence);
    } else {
      currentSequence = 1;
      // Even non-sequential blocks count as sequences of 1
      sequentialBlocks = Math.max(sequentialBlocks, 1);
    }
  }

  return { repeatedFrom, repeatedTo, repeatedValue, sequentialBlocks };
}

/**
 * Calculate spam score based on entropy and patterns
 * Returns a score from 0-100, where higher = more spam
 */
export function calculateSpamScore(
  entropy: number,
  totalEvents: number,
  uniqueAddresses: number,
  patterns: { repeatedFrom: number; repeatedTo: number; repeatedValue: number; sequentialBlocks: number }
): number {
  if (totalEvents === 0) return 0;

  let score = 0;

  // Low entropy = high spam score (max 40 points)
  // Normalize entropy (assuming max entropy for addresses is ~log2(uniqueAddresses))
  const maxPossibleEntropy = Math.log2(Math.max(uniqueAddresses, 1));
  const normalizedEntropy = maxPossibleEntropy > 0 ? entropy / maxPossibleEntropy : 0;
  score += (1 - normalizedEntropy) * 40;

  // High repetition = high spam score (max 30 points)
  const repetitionRatio = Math.max(
    patterns.repeatedFrom / totalEvents,
    patterns.repeatedTo / totalEvents,
    patterns.repeatedValue / totalEvents
  );
  score += repetitionRatio * 30;

  // Sequential blocks = high spam score (max 20 points)
  const sequentialRatio = patterns.sequentialBlocks / totalEvents;
  score += Math.min(sequentialRatio * 20, 20);

  // Low unique addresses ratio = high spam score (max 10 points)
  const uniqueRatio = uniqueAddresses / totalEvents;
  score += (1 - uniqueRatio) * 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine spam level based on spam score
 */
export function getSpamLevel(spamScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (spamScore >= 80) return 'CRITICAL';
  if (spamScore >= 60) return 'HIGH';
  if (spamScore >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(analysis: EntropyAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.spamLevel === 'CRITICAL' || analysis.spamLevel === 'HIGH') {
    recommendations.push('⚠️ High spam activity detected. Consider implementing rate limiting or filtering mechanisms.');
  }

  if (analysis.patterns.repeatedFrom > analysis.totalEvents * 0.5) {
    recommendations.push('🔍 Many events originate from the same address. This could indicate bot activity.');
  }

  if (analysis.patterns.repeatedTo > analysis.totalEvents * 0.5) {
    recommendations.push('🔍 Many events target the same address. This could indicate spam or airdrop activity.');
  }

  if (analysis.patterns.repeatedValue > analysis.totalEvents * 0.5) {
    recommendations.push('🔍 Many events have identical values. This is a strong spam indicator.');
  }

  if (analysis.patterns.sequentialBlocks > analysis.totalEvents * 0.3) {
    recommendations.push('🔍 Events occur in sequential blocks. This pattern is common in spam attacks.');
  }

  if (analysis.entropy < 2) {
    recommendations.push('📊 Very low entropy detected. The event data shows little diversity, suggesting automated/spam activity.');
  }

  if (analysis.uniqueAddresses / analysis.totalEvents < 0.1) {
    recommendations.push('👥 Very few unique addresses relative to total events. This indicates potential spam.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Event patterns appear normal. No significant spam indicators detected.');
  }

  return recommendations;
}

/**
 * Perform complete entropy analysis on events
 */
export function analyzeEventEntropy(events: EventData[]): EntropyAnalysis {
  if (events.length === 0) {
    return {
      entropy: 0,
      uniqueAddresses: 0,
      totalEvents: 0,
      spamScore: 0,
      spamLevel: 'LOW',
      patterns: { repeatedFrom: 0, repeatedTo: 0, repeatedValue: 0, sequentialBlocks: 0 },
      recommendations: ['No events to analyze.']
    };
  }

  // Extract all addresses (from and to)
  const allAddresses = [
    ...events.map(e => e.from),
    ...events.map(e => e.to)
  ];

  // Calculate entropy for addresses
  const addressEntropy = calculateEntropy(allAddresses);

  // Calculate entropy for values
  const valueEntropy = calculateEntropy(events.map(e => e.value));

  // Combined entropy (weighted average)
  const entropy = (addressEntropy * 0.7 + valueEntropy * 0.3);

  // Count unique addresses
  const uniqueAddressSet = new Set(allAddresses);
  const uniqueAddresses = uniqueAddressSet.size;

  // Analyze patterns
  const patterns = analyzePatterns(events);

  // Calculate spam score
  const spamScore = calculateSpamScore(entropy, events.length, uniqueAddresses, patterns);

  // Determine spam level
  const spamLevel = getSpamLevel(spamScore);

  const analysis: EntropyAnalysis = {
    entropy,
    uniqueAddresses,
    totalEvents: events.length,
    spamScore,
    spamLevel,
    patterns,
    recommendations: []
  };

  // Generate recommendations
  analysis.recommendations = generateRecommendations(analysis);

  return analysis;
}

/**
 * Main analysis function
 */
export async function analyzeContractEvents(
  contractAddress: string,
  eventType: 'Transfer' | 'Approval' = 'Transfer',
  fromBlock: number,
  toBlock: number,
  provider?: ethers.Provider
): Promise<AnalysisResult> {
  const eventSignature = eventType === 'Transfer' 
    ? TRANSFER_EVENT_SIGNATURE 
    : APPROVAL_EVENT_SIGNATURE;

  // Fetch events
  const events = await fetchEvents(contractAddress, eventSignature, fromBlock, toBlock, provider);

  // Analyze entropy
  const analysis = analyzeEventEntropy(events);

  return {
    contractAddress,
    eventType,
    blockRange: { from: fromBlock, to: toBlock },
    events,
    analysis
  };
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  const eventType = (process.env.EVENT_TYPE || process.argv[3] || 'Transfer') as 'Transfer' | 'Approval';
  const fromBlock = parseInt(process.env.FROM_BLOCK || process.argv[4] || '0');
  const toBlockArg = process.env.TO_BLOCK || process.argv[5];
  const toBlock = toBlockArg && toBlockArg !== 'latest' ? parseInt(toBlockArg) : Number.MAX_SAFE_INTEGER;

  if (!contractAddress) {
    console.error('Usage: npm start [contract-address] [Transfer|Approval] [from-block] [to-block]');
    console.error('Or set CONTRACT_ADDRESS, EVENT_TYPE, FROM_BLOCK, TO_BLOCK in .env file');
    console.error('Or run without arguments to start the web server');
    process.exit(1);
  }

  console.log(`Analyzing ${eventType} events for contract: ${contractAddress}`);
  console.log(`Block range: ${fromBlock} to ${toBlock === Number.MAX_SAFE_INTEGER ? 'latest' : toBlock}\n`);

  try {
    const provider = getBSCProvider();
    const latestBlock = await provider.getBlockNumber();
    const actualToBlock = toBlock === Number.MAX_SAFE_INTEGER ? latestBlock : Math.min(toBlock, latestBlock);

    const result = await analyzeContractEvents(
      contractAddress,
      eventType,
      fromBlock,
      actualToBlock,
      provider
    );

    console.log(`\n📊 Analysis Results:`);
    console.log(`Total Events: ${result.analysis.totalEvents}`);
    console.log(`Unique Addresses: ${result.analysis.uniqueAddresses}`);
    console.log(`Entropy: ${result.analysis.entropy.toFixed(4)}`);
    console.log(`Spam Score: ${result.analysis.spamScore.toFixed(2)}/100`);
    console.log(`Spam Level: ${result.analysis.spamLevel}`);
    console.log(`\nPatterns:`);
    console.log(`  Repeated From: ${result.analysis.patterns.repeatedFrom}`);
    console.log(`  Repeated To: ${result.analysis.patterns.repeatedTo}`);
    console.log(`  Repeated Value: ${result.analysis.patterns.repeatedValue}`);
    console.log(`  Sequential Blocks: ${result.analysis.patterns.sequentialBlocks}`);
    console.log(`\nRecommendations:`);
    result.analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Start Express server for web UI
 */
export function startServer(port: number = 3000) {
  const app = express();
  
  app.use(express.json());
  
  // Serve static files from root directory
  app.use(express.static(__dirname));
  
  app.get('/', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  
  // API endpoint for event analysis
  app.post('/api/analyze', async (req: express.Request, res: express.Response) => {
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
  
  app.listen(port, () => {
    console.log(`Event Entropy Analyzer server running on http://localhost:${port}`);
    console.log('Open your browser to view the UI');
  });
}

// Run if executed directly
if (require.main === module) {
  // Check if 'server' is explicitly requested or no CLI arguments provided
  if (process.argv[2] === 'server' || process.argv.length === 2) {
    const port = parseInt(process.env.PORT || process.argv[3] || '3000');
    startServer(port);
  } else {
    // CLI mode - use argument or env var
    const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
    if (!contractAddress) {
      console.error('Usage: npm start [contract-address] [Transfer|Approval] [from-block] [to-block]');
      console.error('Or set CONTRACT_ADDRESS, EVENT_TYPE, FROM_BLOCK, TO_BLOCK in .env file');
      console.error('Or run without arguments to start the web server');
      process.exit(1);
    }
    // Update argv for main function
    process.argv[2] = contractAddress;
    main().catch(console.error);
  }
}


import { BlockProducerFairnessMonitor, BlockProducerStats, FairnessMetrics } from './app';
import { ethers } from 'ethers';

// Mock ethers provider
const mockGetBlockNumber = jest.fn();
const mockGetBlock = jest.fn();

const mockProvider = {
  getBlockNumber: mockGetBlockNumber,
  getBlock: mockGetBlock,
};

jest.mock('ethers', () => {
  return {
    ethers: {
      JsonRpcProvider: jest.fn(() => mockProvider),
    },
  };
});

describe('BlockProducerFairnessMonitor', () => {
  let monitor: BlockProducerFairnessMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BSC_RPC_URL = 'https://test-rpc-url.com';
    process.env.PORT = '3000';
    monitor = new BlockProducerFairnessMonitor();
  });

  describe('calculateGiniCoefficient', () => {
    it('should return 0 for empty array', () => {
      const result = (monitor as any).calculateGiniCoefficient([]);
      expect(result).toBe(0);
    });

    it('should return 0 for single element', () => {
      const result = (monitor as any).calculateGiniCoefficient([10]);
      expect(result).toBe(0);
    });

    it('should return 0 for equal distribution', () => {
      const result = (monitor as any).calculateGiniCoefficient([10, 10, 10, 10]);
      expect(result).toBe(0);
    });

    it('should return higher value for unequal distribution', () => {
      const equal = (monitor as any).calculateGiniCoefficient([10, 10, 10, 10]);
      const unequal = (monitor as any).calculateGiniCoefficient([1, 1, 1, 37]);
      expect(unequal).toBeGreaterThan(equal);
    });

    it('should handle maximum inequality', () => {
      const result = (monitor as any).calculateGiniCoefficient([0, 0, 0, 100]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('formatAddress', () => {
    it('should format valid address', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = (monitor as any).formatAddress(address);
      expect(result).toBe('0x1234...7890');
    });

    it('should return "Unknown" for zero address', () => {
      const result = (monitor as any).formatAddress('0x0000000000000000000000000000000000000000');
      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for empty string', () => {
      const result = (monitor as any).formatAddress('');
      expect(result).toBe('Unknown');
    });
  });

  describe('fetchRecentBlocks', () => {
    it('should fetch blocks successfully', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      mockGetBlock.mockImplementation((blockNumber: number) => {
        return Promise.resolve({
          number: blockNumber,
          miner: `0x${blockNumber.toString().padStart(40, '0')}`,
        });
      });

      const blocks = await (monitor as any).fetchRecentBlocks(5);
      expect(blocks).toHaveLength(5);
      expect(blocks[0].number).toBe(100);
      expect(blocks[4].number).toBe(96);
    });

    it('should handle errors gracefully', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      mockGetBlock.mockRejectedValue(new Error('Block not found'));

      const blocks = await (monitor as any).fetchRecentBlocks(5);
      expect(blocks).toHaveLength(0);
    });

    it('should handle missing miner field', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      mockGetBlock.mockResolvedValue({
        number: 100,
        miner: null,
      });

      const blocks = await (monitor as any).fetchRecentBlocks(1);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].producer).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  describe('analyzeBlockProducers', () => {
    it('should analyze block producers correctly', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      // Create blocks with different producers
      const producers = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];
      
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = producers[blockIndex % producers.length];
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(9);

      expect(result.totalBlocks).toBe(9);
      expect(result.uniqueProducers).toBe(3);
      expect(result.producers).toHaveLength(3);
      expect(result.producers.every(p => p.blockCount === 3)).toBe(true);
      expect(result.giniCoefficient).toBe(0); // Equal distribution
      expect(result.isFair).toBe(true);
    });

    it('should detect unfair distribution', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      // Create blocks with one dominant producer
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = blockIndex < 8 
          ? '0x1111111111111111111111111111111111111111'
          : '0x2222222222222222222222222222222222222222';
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(10);

      expect(result.totalBlocks).toBe(10);
      expect(result.uniqueProducers).toBe(2);
      expect(result.producers[0].blockCount).toBe(8);
      expect(result.producers[1].blockCount).toBe(2);
      expect(result.giniCoefficient).toBeGreaterThan(0);
    });

    it('should calculate correct percentages', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = blockIndex < 6 
          ? '0x1111111111111111111111111111111111111111'
          : '0x2222222222222222222222222222222222222222';
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(10);

      expect(result.producers[0].percentage).toBe(60);
      expect(result.producers[1].percentage).toBe(40);
    });

    it('should calculate correct deviations', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = blockIndex < 7 
          ? '0x1111111111111111111111111111111111111111'
          : '0x2222222222222222222222222222222222222222';
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(10);
      const expectedBlocks = 5;

      expect(result.producers[0].deviation).toBe(2); // 7 - 5
      expect(result.producers[1].deviation).toBe(-2); // 3 - 5
    });

    it('should sort producers by block count descending', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      const producers = [
        '0x1111111111111111111111111111111111111111', // 1 block
        '0x2222222222222222222222222222222222222222', // 3 blocks
        '0x3333333333333333333333333333333333333333', // 2 blocks
      ];
      
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        let producer;
        if (blockIndex < 1) {
          producer = producers[0];
        } else if (blockIndex < 4) {
          producer = producers[1];
        } else {
          producer = producers[2];
        }
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(6);

      expect(result.producers[0].address).toBe(producers[1]);
      expect(result.producers[1].address).toBe(producers[2]);
      expect(result.producers[2].address).toBe(producers[0]);
    });
  });

  describe('Fairness determination', () => {
    it('should mark as fair when Gini < 0.3 and deviation < 20%', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      // Equal distribution
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = blockIndex % 2 === 0
          ? '0x1111111111111111111111111111111111111111'
          : '0x2222222222222222222222222222222222222222';
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(100);
      expect(result.isFair).toBe(true);
    });

    it('should mark as unfair when Gini >= 0.3', async () => {
      mockGetBlockNumber.mockResolvedValue(100);
      
      // Highly unequal distribution
      let blockIndex = 0;
      mockGetBlock.mockImplementation(() => {
        const producer = blockIndex < 90
          ? '0x1111111111111111111111111111111111111111'
          : '0x2222222222222222222222222222222222222222';
        blockIndex++;
        return Promise.resolve({
          number: 100 - (blockIndex - 1),
          miner: producer,
        });
      });

      const result = await monitor.analyzeBlockProducers(100);
      expect(result.isFair).toBe(false);
    });
  });
});


import {
  getBSCProvider,
  isContract,
  fetchTransactions,
  calculateBehaviorMetrics,
  classifyBehaviorType,
  calculateRiskScore,
  generateSignature,
  generateFingerprint,
  generateBehaviorFingerprint,
} from './app';
import { ethers } from 'ethers';

// Mock crypto
jest.mock('crypto');

describe('On-Chain Behavior Fingerprint Generator', () => {
  const mockProvider = {
    getCode: jest.fn(),
    getBlockNumber: jest.fn(),
    getBlock: jest.fn(),
    getTransaction: jest.fn(),
    getTransactionReceipt: jest.fn(),
    getLogs: jest.fn(),
  };

  const mockBlock = {
    number: 1000,
    timestamp: 1234567890,
    transactions: [],
    miner: '0x0000000000000000000000000000000000000000',
  };

  const mockTransaction = {
    hash: '0x123',
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1234567890123456789012345678901234567890',
    value: ethers.parseEther('1'),
    gasPrice: ethers.parseUnits('5', 'gwei'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ethers, 'JsonRpcProvider').mockImplementation(() => mockProvider as any);
    jest.spyOn(ethers, 'getAddress').mockImplementation((addr) => {
      if (!addr) return addr;
      return addr.toLowerCase();
    });
    jest.spyOn(ethers, 'zeroPadValue').mockImplementation((addr: any, len: number) => {
      const addrStr = typeof addr === 'string' ? addr : '0x' + Buffer.from(addr).toString('hex');
      return '0x' + addrStr.slice(2).padStart(len * 2 - 2, '0');
    });
  });

  describe('getBSCProvider', () => {
    it('should create a BSC provider with default RPC URL', () => {
      delete process.env.BSC_RPC_URL;
      getBSCProvider();
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('https://bsc-dataseed1.binance.org/');
    });

    it('should create a BSC provider with custom RPC URL from env', () => {
      process.env.BSC_RPC_URL = 'https://custom-rpc.com';
      getBSCProvider();
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('https://custom-rpc.com');
    });
  });

  describe('isContract', () => {
    it('should return true for contract address', async () => {
      mockProvider.getCode.mockResolvedValue('0x608060405234801561001057600080fd5b50');
      const result = await isContract('0x123', mockProvider as any);
      expect(result).toBe(true);
      expect(mockProvider.getCode).toHaveBeenCalledWith('0x123');
    });

    it('should return false for EOA address', async () => {
      mockProvider.getCode.mockResolvedValue('0x');
      const result = await isContract('0x123', mockProvider as any);
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockProvider.getCode.mockRejectedValue(new Error('Network error'));
      const result = await isContract('0x123', mockProvider as any);
      expect(result).toBe(false);
    });
  });

  describe('fetchTransactions', () => {
    it('should fetch transactions for an address', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(1000);
      mockProvider.getBlock.mockResolvedValue({
        ...mockBlock,
        transactions: [mockTransaction],
      });
      mockProvider.getTransactionReceipt.mockResolvedValue({
        gasUsed: ethers.parseUnits('21000', 'wei'),
      });

      const result = await fetchTransactions('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', mockProvider as any, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].from).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should handle empty transaction list', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(1000);
      mockProvider.getBlock.mockResolvedValue({
        ...mockBlock,
        transactions: [],
      });
      mockProvider.getLogs.mockResolvedValue([]);

      const result = await fetchTransactions('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', mockProvider as any, 100);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(1000);
      mockProvider.getBlock.mockRejectedValue(new Error('Network error'));

      const result = await fetchTransactions('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', mockProvider as any, 100);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('calculateBehaviorMetrics', () => {
    it('should calculate metrics from transactions', () => {
      const transactions = [
        {
          hash: '0x1',
          timestamp: 1234567890,
          from: '0xabc',
          to: '0xdef',
          value: ethers.parseEther('1'),
          gasUsed: ethers.parseUnits('21000', 'wei'),
          gasPrice: ethers.parseUnits('5', 'gwei'),
          isContractCreation: false,
          isTokenTransfer: false,
        },
        {
          hash: '0x2',
          timestamp: 1234567890 + 86400, // 1 day later
          from: '0xabc',
          to: '0x11111112542D85B3EF69AE05771c2dCCff4fAa26', // DEX router
          value: ethers.parseEther('0.5'),
          gasUsed: ethers.parseUnits('150000', 'wei'),
          gasPrice: ethers.parseUnits('5', 'gwei'),
          isContractCreation: false,
          isTokenTransfer: false,
        },
      ];

      const metrics = calculateBehaviorMetrics(transactions, '0xabc');

      expect(metrics.totalTransactions).toBe(2);
      expect(metrics.uniqueContracts.size).toBe(2);
      expect(metrics.dexInteractions).toBe(1);
      expect(metrics.transactionFrequency).toBeGreaterThan(0);
    });

    it('should handle empty transaction list', () => {
      const metrics = calculateBehaviorMetrics([], '0xabc');

      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.uniqueContracts.size).toBe(0);
      expect(metrics.transactionFrequency).toBe(0);
    });

    it('should identify token transfers', () => {
      const transactions = [
        {
          hash: '0x1',
          timestamp: 1234567890,
          from: '0xabc',
          to: '0xdef',
          value: 0n,
          gasUsed: ethers.parseUnits('65000', 'wei'),
          gasPrice: ethers.parseUnits('5', 'gwei'),
          isContractCreation: false,
          isTokenTransfer: true,
          tokenAddress: '0xtoken',
        },
      ];

      const metrics = calculateBehaviorMetrics(transactions, '0xabc');

      expect(metrics.tokenTransfers).toBe(1);
      expect(metrics.uniqueTokens.size).toBe(1);
    });

    it('should identify contract creations', () => {
      const transactions = [
        {
          hash: '0x1',
          timestamp: 1234567890,
          from: '0xabc',
          to: '',
          value: ethers.parseEther('0.1'),
          gasUsed: ethers.parseUnits('2000000', 'wei'),
          gasPrice: ethers.parseUnits('5', 'gwei'),
          isContractCreation: true,
          isTokenTransfer: false,
        },
      ];

      const metrics = calculateBehaviorMetrics(transactions, '0xabc');

      expect(metrics.contractCreations).toBe(1);
    });

    it('should calculate active hours and days', () => {
      const baseTimestamp = 1234567890;
      const transactions = [
        {
          hash: '0x1',
          timestamp: baseTimestamp,
          from: '0xabc',
          to: '0xdef',
          value: 0n,
          gasUsed: ethers.parseUnits('21000', 'wei'),
          gasPrice: ethers.parseUnits('5', 'gwei'),
          isContractCreation: false,
          isTokenTransfer: false,
        },
      ];

      const metrics = calculateBehaviorMetrics(transactions, '0xabc');

      expect(metrics.activeHours.size).toBeGreaterThan(0);
      expect(metrics.activeDays.size).toBeGreaterThan(0);
    });
  });

  describe('classifyBehaviorType', () => {
    it('should classify as BOT for high frequency, low value', () => {
      const metrics = {
        totalTransactions: 100,
        uniqueContracts: new Set<string>(['0x1', '0x2']),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('0.1'),
        averageGasUsed: ethers.parseUnits('21000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 60,
        activeHours: new Set<number>([10, 11, 12]),
        activeDays: new Set<number>([1, 2, 3]),
        dexInteractions: 5,
        contractCreations: 0,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('0.0009'),
        timeSpan: 1,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('BOT');
    });

    it('should classify as DEX_TRADER for high DEX interactions', () => {
      const metrics = {
        totalTransactions: 100,
        uniqueContracts: new Set<string>(['0x1', '0x2']),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('10'),
        averageGasUsed: ethers.parseUnits('150000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 10,
        activeHours: new Set<number>([10, 11, 12]),
        activeDays: new Set<number>([1, 2, 3]),
        dexInteractions: 40, // 40% of transactions
        contractCreations: 0,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('0.1'),
        timeSpan: 10,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('DEX_TRADER');
    });

    it('should classify as WHALE for high value transactions', () => {
      const metrics = {
        totalTransactions: 10,
        uniqueContracts: new Set<string>(['0x1']),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('2000'),
        averageGasUsed: ethers.parseUnits('21000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 1,
        activeHours: new Set([10]),
        activeDays: new Set([1]),
        dexInteractions: 0,
        contractCreations: 0,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('200'),
        timeSpan: 10,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('WHALE');
    });

    it('should classify as CONTRACT_INTERACTOR for many contracts', () => {
      const contracts = new Set<string>();
      for (let i = 0; i < 25; i++) {
        contracts.add(`0x${i.toString().padStart(40, '0')}`);
      }

      const metrics = {
        totalTransactions: 50,
        uniqueContracts: contracts,
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('10'),
        averageGasUsed: ethers.parseUnits('100000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 5,
        activeHours: new Set<number>([10, 11]),
        activeDays: new Set<number>([1, 2]),
        dexInteractions: 5,
        contractCreations: 2,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('0.2'),
        timeSpan: 10,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('CONTRACT_INTERACTOR');
    });

    it('should classify as NORMAL for typical behavior', () => {
      const metrics = {
        totalTransactions: 20,
        uniqueContracts: new Set<string>(['0x1', '0x2', '0x3']),
        uniqueTokens: new Set<string>(['0xtoken1']),
        totalValueTransferred: ethers.parseEther('5'),
        averageGasUsed: ethers.parseUnits('50000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 2,
        activeHours: new Set([10, 14, 18]),
        activeDays: new Set([1, 3, 5]),
        dexInteractions: 2,
        contractCreations: 0,
        tokenTransfers: 5,
        averageTransactionValue: ethers.parseEther('0.25'),
        timeSpan: 10,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('NORMAL');
    });

    it('should classify as UNKNOWN for no transactions', () => {
      const metrics = {
        totalTransactions: 0,
        uniqueContracts: new Set<string>(),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: 0n,
        averageGasUsed: 0n,
        averageGasPrice: 0n,
        transactionFrequency: 0,
        activeHours: new Set<number>(),
        activeDays: new Set<number>(),
        dexInteractions: 0,
        contractCreations: 0,
        tokenTransfers: 0,
        averageTransactionValue: 0n,
        timeSpan: 0,
      };

      const type = classifyBehaviorType(metrics);
      expect(type).toBe('UNKNOWN');
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate low risk score for normal behavior', () => {
      const metrics = {
        totalTransactions: 10,
        uniqueContracts: new Set<string>(['0x1']),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('1'),
        averageGasUsed: ethers.parseUnits('50000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 1,
        activeHours: new Set([10, 11, 12, 13, 14]),
        activeDays: new Set([1, 2, 3, 4, 5]),
        dexInteractions: 0,
        contractCreations: 0,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('0.1'),
        timeSpan: 10,
      };

      const score = calculateRiskScore(metrics, 'NORMAL');
      expect(score).toBeLessThan(30);
    });

    it('should calculate high risk score for bot behavior', () => {
      const metrics = {
        totalTransactions: 200,
        uniqueContracts: new Set<string>(['0x1']),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: ethers.parseEther('0.1'),
        averageGasUsed: ethers.parseUnits('21000', 'wei'),
        averageGasPrice: ethers.parseUnits('1', 'gwei'),
        transactionFrequency: 150,
        activeHours: new Set<number>([10]),
        activeDays: new Set<number>([1]),
        dexInteractions: 0,
        contractCreations: 10,
        tokenTransfers: 0,
        averageTransactionValue: ethers.parseEther('0.0005'),
        timeSpan: 1,
      };

      const score = calculateRiskScore(metrics, 'BOT');
      expect(score).toBeGreaterThan(50);
    });

    it('should cap risk score at 100', () => {
      const metrics = {
        totalTransactions: 1000,
        uniqueContracts: new Set<string>(),
        uniqueTokens: new Set<string>(),
        totalValueTransferred: 0n,
        averageGasUsed: 0n,
        averageGasPrice: ethers.parseUnits('20', 'gwei'),
        transactionFrequency: 200,
        activeHours: new Set([10]),
        activeDays: new Set([1]),
        dexInteractions: 0,
        contractCreations: 20,
        tokenTransfers: 0,
        averageTransactionValue: 0n,
        timeSpan: 1,
      };

      const score = calculateRiskScore(metrics, 'BOT');
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('generateSignature', () => {
    it('should generate signature string from metrics', () => {
      const metrics = {
        totalTransactions: 10,
        uniqueContracts: new Set<string>(['0x1', '0x2']),
        uniqueTokens: new Set<string>(['0xtoken1']),
        totalValueTransferred: ethers.parseEther('1'),
        averageGasUsed: ethers.parseUnits('50000', 'wei'),
        averageGasPrice: ethers.parseUnits('5', 'gwei'),
        transactionFrequency: 2.5,
        activeHours: new Set<number>([10, 14]),
        activeDays: new Set<number>([1, 3]),
        dexInteractions: 2,
        contractCreations: 0,
        tokenTransfers: 5,
        averageTransactionValue: ethers.parseEther('0.1'),
        timeSpan: 5,
      };

      const signature = generateSignature(metrics, 'NORMAL');
      expect(signature).toContain('TX:10');
      expect(signature).toContain('FREQ:2.50');
      expect(signature).toContain('CONTRACTS:2');
      expect(signature).toContain('TOKENS:1');
      expect(signature).toContain('DEX:2');
      expect(signature).toContain('TYPE:NORMAL');
    });
  });

  describe('generateFingerprint', () => {
    it('should generate SHA-256 hash from signature', () => {
      const { createHash } = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123def456'),
      };
      createHash.mockReturnValue(mockHash);

      const signature = 'TX:10|FREQ:2.5|TYPE:NORMAL';
      const fingerprint = generateFingerprint(signature);

      expect(createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(signature);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(fingerprint).toBe('abc123def456');
    });
  });

  describe('generateBehaviorFingerprint', () => {
    it('should generate complete fingerprint', async () => {
      const { createHash } = require('crypto');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('testfingerprint123'),
      };
      createHash.mockReturnValue(mockHash);

      mockProvider.getBlockNumber.mockResolvedValue(1000);
      mockProvider.getBlock.mockResolvedValue({
        ...mockBlock,
        transactions: [],
      });
      mockProvider.getLogs.mockResolvedValue([]);

      const result = await generateBehaviorFingerprint('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 100);

      expect(result.address).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      expect(result.fingerprint).toBe('testfingerprint123');
      expect(result.metrics).toBeDefined();
      expect(result.behaviorType).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });
});




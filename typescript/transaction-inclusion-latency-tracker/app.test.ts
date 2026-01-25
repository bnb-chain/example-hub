import {
  getBSCProvider,
  trackTransactionLatency,
  monitorTransaction,
  calculateLatencyStats,
  sendTestTransaction,
  TransactionLatencyResult,
  LatencyStats
} from './app';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers');

describe('Transaction Inclusion Latency Tracker', () => {
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      waitForTransaction: jest.fn(),
      getTransaction: jest.fn(),
      getBlock: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getFeeData: jest.fn(),
      getCode: jest.fn()
    };

    (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
  });

  describe('getBSCProvider', () => {
    it('should create a provider with default RPC URL', () => {
      const originalEnv = process.env.BSC_RPC_URL;
      delete process.env.BSC_RPC_URL;

      getBSCProvider();

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('https://bsc-dataseed1.binance.org/');
      
      if (originalEnv) {
        process.env.BSC_RPC_URL = originalEnv;
      }
    });

    it('should create a provider with custom RPC URL from env', () => {
      const customUrl = 'https://custom-rpc-url.com';
      process.env.BSC_RPC_URL = customUrl;

      getBSCProvider();

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(customUrl);
    });
  });

  describe('trackTransactionLatency', () => {
    it('should track successful transaction latency', async () => {
      const txHash = '0x1234567890abcdef';
      const submittedAt = Date.now() - 3000;
      const mockReceipt = {
        blockNumber: 12345,
        status: 1
      };

      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await trackTransactionLatency(txHash, submittedAt);

      expect(result.txHash).toBe(txHash);
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(12345);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.includedAt).toBeDefined();
    });

    it('should handle failed transaction', async () => {
      const txHash = '0x1234567890abcdef';
      const submittedAt = Date.now();
      const mockReceipt = {
        blockNumber: 12345,
        status: 0
      };

      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await trackTransactionLatency(txHash, submittedAt);

      expect(result.status).toBe('failed');
      expect(result.blockNumber).toBe(12345);
    });

    it('should handle timeout', async () => {
      const txHash = '0x1234567890abcdef';
      const submittedAt = Date.now();

      mockProvider.waitForTransaction.mockResolvedValue(null);

      const result = await trackTransactionLatency(txHash, submittedAt);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Transaction not found or timeout');
    });

    it('should handle errors', async () => {
      const txHash = '0x1234567890abcdef';
      const submittedAt = Date.now();

      mockProvider.waitForTransaction.mockRejectedValue(new Error('Network error'));

      const result = await trackTransactionLatency(txHash, submittedAt);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Network error');
    });
  });

  describe('monitorTransaction', () => {
    it('should monitor already confirmed transaction', async () => {
      const txHash = '0x1234567890abcdef';
      const mockTx = {
        blockNumber: 12345,
        hash: txHash
      };
      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345
      };
      const mockReceipt = {
        blockNumber: 12345,
        status: 1
      };

      mockProvider.getTransaction.mockResolvedValue(mockTx);
      mockProvider.getBlock.mockResolvedValue(mockBlock);
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const result = await monitorTransaction(txHash);

      expect(result.txHash).toBe(txHash);
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(12345);
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    it('should handle pending transaction', async () => {
      const txHash = '0x1234567890abcdef';
      const mockTx = {
        blockNumber: null,
        hash: txHash
      };
      const mockReceipt = {
        blockNumber: 12345,
        status: 1
      };

      mockProvider.getTransaction.mockResolvedValue(mockTx);
      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await monitorTransaction(txHash);

      expect(result.txHash).toBe(txHash);
      expect(mockProvider.waitForTransaction).toHaveBeenCalled();
    });

    it('should handle transaction not found', async () => {
      const txHash = '0x1234567890abcdef';

      mockProvider.getTransaction.mockResolvedValue(null);

      const result = await monitorTransaction(txHash);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Transaction not found');
    });

    it('should handle errors', async () => {
      const txHash = '0x1234567890abcdef';

      mockProvider.getTransaction.mockRejectedValue(new Error('RPC error'));

      const result = await monitorTransaction(txHash);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('RPC error');
    });
  });

  describe('calculateLatencyStats', () => {
    it('should calculate stats from confirmed transactions', () => {
      const results: TransactionLatencyResult[] = [
        {
          txHash: '0x1',
          submittedAt: 1000,
          includedAt: 2000,
          latencyMs: 1000,
          blockNumber: 1,
          status: 'confirmed'
        },
        {
          txHash: '0x2',
          submittedAt: 2000,
          includedAt: 3500,
          latencyMs: 1500,
          blockNumber: 2,
          status: 'confirmed'
        },
        {
          txHash: '0x3',
          submittedAt: 3000,
          includedAt: 5000,
          latencyMs: 2000,
          blockNumber: 3,
          status: 'confirmed'
        }
      ];

      const stats = calculateLatencyStats(results);

      expect(stats.totalTransactions).toBe(3);
      expect(stats.confirmedTransactions).toBe(3);
      expect(stats.averageLatencyMs).toBe(1500);
      expect(stats.minLatencyMs).toBe(1000);
      expect(stats.maxLatencyMs).toBe(2000);
      expect(stats.pendingCount).toBe(0);
    });

    it('should handle mixed statuses', () => {
      const results: TransactionLatencyResult[] = [
        {
          txHash: '0x1',
          submittedAt: 1000,
          includedAt: 2000,
          latencyMs: 1000,
          blockNumber: 1,
          status: 'confirmed'
        },
        {
          txHash: '0x2',
          submittedAt: 2000,
          includedAt: null,
          latencyMs: null,
          blockNumber: null,
          status: 'pending'
        },
        {
          txHash: '0x3',
          submittedAt: 3000,
          includedAt: null,
          latencyMs: null,
          blockNumber: null,
          status: 'failed'
        }
      ];

      const stats = calculateLatencyStats(results);

      expect(stats.totalTransactions).toBe(3);
      expect(stats.confirmedTransactions).toBe(1);
      expect(stats.averageLatencyMs).toBe(1000);
      expect(stats.minLatencyMs).toBe(1000);
      expect(stats.maxLatencyMs).toBe(1000);
      expect(stats.pendingCount).toBe(1);
    });

    it('should handle empty results', () => {
      const stats = calculateLatencyStats([]);

      expect(stats.totalTransactions).toBe(0);
      expect(stats.confirmedTransactions).toBe(0);
      expect(stats.averageLatencyMs).toBe(0);
      expect(stats.minLatencyMs).toBe(0);
      expect(stats.maxLatencyMs).toBe(0);
    });

    it('should handle no confirmed transactions', () => {
      const results: TransactionLatencyResult[] = [
        {
          txHash: '0x1',
          submittedAt: 1000,
          includedAt: null,
          latencyMs: null,
          blockNumber: null,
          status: 'pending'
        }
      ];

      const stats = calculateLatencyStats(results);

      expect(stats.totalTransactions).toBe(1);
      expect(stats.confirmedTransactions).toBe(0);
      expect(stats.averageLatencyMs).toBe(0);
      expect(stats.pendingCount).toBe(1);
    });
  });

  describe('sendTestTransaction', () => {
    it('should send test transaction and track latency', async () => {
      const mockConnectedWallet = {
        sendTransaction: jest.fn()
      };
      const mockWallet = {
        address: '0xWalletAddress',
        connect: jest.fn().mockReturnValue(mockConnectedWallet)
      };
      const mockTx = {
        hash: '0xTransactionHash'
      };
      const mockReceipt = {
        blockNumber: 12345,
        status: 1
      };
      const mockFeeData = {
        gasPrice: BigInt('5000000000') // 5 gwei in wei
      };

      mockProvider.getFeeData.mockResolvedValue(mockFeeData);
      mockConnectedWallet.sendTransaction.mockResolvedValue(mockTx);
      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await sendTestTransaction(mockWallet as any);

      expect(result.txHash).toBe('0xTransactionHash');
      expect(result.status).toBe('confirmed');
      expect(mockConnectedWallet.sendTransaction).toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const mockConnectedWallet = {
        sendTransaction: jest.fn()
      };
      const mockWallet = {
        address: '0xWalletAddress',
        connect: jest.fn().mockReturnValue(mockConnectedWallet)
      };

      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('5000000000') }); // 5 gwei in wei
      mockConnectedWallet.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));

      const result = await sendTestTransaction(mockWallet as any);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Insufficient funds');
    });

    it('should handle missing gas price', async () => {
      const mockWallet = {
        address: '0xWalletAddress',
        connect: jest.fn()
      };

      mockProvider.getFeeData.mockResolvedValue({ gasPrice: null });

      await expect(sendTestTransaction(mockWallet as any)).rejects.toThrow('Unable to fetch gas price');
    });
  });
});


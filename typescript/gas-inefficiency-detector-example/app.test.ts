// Mock ethers module - Jest will automatically use __mocks__/ethers.ts
jest.mock('ethers');

import { 
  getBSCProvider, 
  analyzeTransaction, 
  analyzeMultipleTransactions
} from './app';
import { ethers } from 'ethers';

// Access mock functions from the mocked module using require
const mockedEthers = require('ethers');
const setSharedMockProvider: (provider: any) => void = mockedEthers.setSharedMockProvider;
const getMockJsonRpcProvider: () => jest.Mock = mockedEthers.getMockJsonRpcProvider;

describe('Gas Inefficiency Detector', () => {
  let mockProvider: jest.Mocked<ethers.Provider>;
  let mockTransaction: any;
  let mockReceipt: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear the mock provider calls
    const MockJsonRpcProvider = getMockJsonRpcProvider();
    MockJsonRpcProvider.mockClear();

    // Create mock provider with fresh jest functions
    mockProvider = {
      getTransactionReceipt: jest.fn(),
      getTransaction: jest.fn(),
      getCode: jest.fn(),
      getBlock: jest.fn(),
      destroy: jest.fn(),
      _start: jest.fn().mockResolvedValue(undefined),
      _waitForConnection: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Update shared mock provider BEFORE any providers are created
    setSharedMockProvider(mockProvider);
    
    // Also directly mock JsonRpcProvider to ensure it returns our mock provider
    MockJsonRpcProvider.mockImplementation(() => mockProvider);

    // Create mock transaction
    mockTransaction = {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: 0n,
      gasPrice: ethers.parseUnits('5', 'gwei'),
      maxFeePerGas: ethers.parseUnits('5', 'gwei'),
      data: '0x',
      blockNumber: null,
      blockHash: null,
      index: 0,
      gasLimit: 21000n,
      nonce: 0,
      chainId: 56n,
      type: 2,
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
    };

    // Create mock receipt
    mockReceipt = {
      blockNumber: 12345,
      gasUsed: 100000n,
      status: 1,
      contractAddress: null,
      logs: [],
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      index: 0,
      blockHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      to: '0x2222222222222222222222222222222222222222',
      from: '0x1111111111111111111111111111111111111111',
      cumulativeGasUsed: 100000n,
      gasPrice: ethers.parseUnits('5', 'gwei'),
      type: 2,
      effectiveGasPrice: ethers.parseUnits('5', 'gwei'),
      root: null,
      logsBloom: '0x' + '0'.repeat(512)
    };
  });

  afterEach(() => {
    // Clean up any pending async operations
    jest.clearAllTimers();
    // Clean up environment variables
    delete process.env.BSC_RPC_URL;
    setSharedMockProvider(null);
  });

  describe('getBSCProvider', () => {
    it('should return a BSC provider with default RPC URL', () => {
      delete process.env.BSC_RPC_URL;
      const MockJsonRpcProvider = getMockJsonRpcProvider();
      MockJsonRpcProvider.mockClear();
      // Ensure shared provider is set
      setSharedMockProvider(mockProvider);
      const provider = getBSCProvider();
      expect(provider).toBeDefined();
      expect(provider).toBe(mockProvider); // Should return the shared mock provider
      expect(MockJsonRpcProvider).toHaveBeenCalledWith('https://bsc-dataseed1.binance.org/');
    });

    it('should return a BSC provider with custom RPC URL from env', () => {
      const originalEnv = process.env.BSC_RPC_URL;
      try {
        process.env.BSC_RPC_URL = 'https://custom-rpc-url.com';
        const MockJsonRpcProvider = getMockJsonRpcProvider();
        MockJsonRpcProvider.mockClear();
        // Ensure shared provider is set
        setSharedMockProvider(mockProvider);
        const provider = getBSCProvider();
        expect(provider).toBeDefined();
        expect(provider).toBe(mockProvider); // Should return the shared mock provider
        expect(MockJsonRpcProvider).toHaveBeenCalledWith('https://custom-rpc-url.com');
      } finally {
        if (originalEnv) {
          process.env.BSC_RPC_URL = originalEnv;
        } else {
          delete process.env.BSC_RPC_URL;
        }
      }
    });
  });

  describe('analyzeTransaction', () => {
    it('should analyze a transaction successfully', async () => {
      // Ensure the shared provider is set and mock is configured
      setSharedMockProvider(mockProvider);
      const MockJsonRpcProvider = getMockJsonRpcProvider();
      MockJsonRpcProvider.mockImplementation(() => mockProvider);
      
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt as any);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      expect(result).toBeDefined();
      expect(result.txHash).toBe(mockTransaction.hash);
      expect(result.blockNumber).toBe(mockReceipt.blockNumber);
      expect(result.from).toBe(mockTransaction.from);
      expect(result.to).toBe(mockTransaction.to);
      expect(result.gasUsed).toBe(mockReceipt.gasUsed);
      expect(result.inefficiencies).toBeInstanceOf(Array);
      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should throw error if transaction receipt not found', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null);

      await expect(analyzeTransaction('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).rejects.toThrow('Transaction receipt not found');
    });

    it('should throw error if transaction not found', async () => {
      // First call returns receipt, second call (getTransaction) returns null
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt as any);
      mockProvider.getTransaction.mockResolvedValue(null);

      await expect(analyzeTransaction('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).rejects.toThrow('Transaction not found');
    });

    it('should detect high gas usage inefficiency', async () => {
      const highGasReceipt = { ...mockReceipt, gasUsed: 600000n } as any; // High gas usage
      mockProvider.getTransactionReceipt.mockResolvedValue(highGasReceipt);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      expect(result.inefficiencies.length).toBeGreaterThan(0);
      const highGasIneff = result.inefficiencies.find(i => 
        i.description.includes('relatively high')
      );
      expect(highGasIneff).toBeDefined();
    });

    it('should detect contract creation inefficiency', async () => {
      const contractCreationReceipt = { ...mockReceipt, contractAddress: '0x3333333333333333333333333333333333333333' } as any;
      mockProvider.getTransactionReceipt.mockResolvedValue(contractCreationReceipt);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      const contractCreationIneff = result.inefficiencies.find(i => 
        i.description.includes('created a new contract')
      );
      expect(contractCreationIneff).toBeDefined();
    });

    it('should detect excessive event emissions', async () => {
      // Create 25 mock logs
      const manyLogsReceipt = { ...mockReceipt, logs: Array(25).fill({ address: '0x123', topics: [], data: '0x' }) } as any;
      mockProvider.getTransactionReceipt.mockResolvedValue(manyLogsReceipt);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      const eventIneff = result.inefficiencies.find(i => 
        i.description.includes('emitted') && i.description.includes('events')
      );
      expect(eventIneff).toBeDefined();
      expect(eventIneff?.estimatedGasSavings).toBeGreaterThan(0);
    });

    it('should detect failed transaction', async () => {
      const failedReceipt = { ...mockReceipt, status: 0 } as any; // Failed transaction
      mockProvider.getTransactionReceipt.mockResolvedValue(failedReceipt);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      const failedTxIneff = result.inefficiencies.find(i => 
        i.severity === 'CRITICAL' && i.description.includes('failed')
      );
      expect(failedTxIneff).toBeDefined();
      expect(failedTxIneff?.estimatedGasSavings).toBe(Number(failedReceipt.gasUsed));
    });

    it('should detect high gas price', async () => {
      const highGasPriceTransaction = { ...mockTransaction, maxFeePerGas: ethers.parseUnits('10', 'gwei') } as any; // High gas price
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt as any);
      mockProvider.getTransaction.mockResolvedValue(highGasPriceTransaction);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei') // Base fee is much lower
      } as any);

      const result = await analyzeTransaction(highGasPriceTransaction.hash);

      const gasPriceIneff = result.inefficiencies.find(i => 
        i.description.includes('Gas price') && i.description.includes('higher than base fee')
      );
      expect(gasPriceIneff).toBeDefined();
    });
  });

  describe('analyzeMultipleTransactions', () => {
    it('should analyze multiple transactions', async () => {
      const txHashes = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      ];

      // Each analyzeTransaction call creates a new provider, so we need mocks for each call
      mockProvider.getTransactionReceipt
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(mockReceipt as any);

      mockProvider.getTransaction
        .mockResolvedValueOnce(mockTransaction as any)
        .mockResolvedValueOnce(mockTransaction as any);

      mockProvider.getCode
        .mockResolvedValueOnce('0x1234')
        .mockResolvedValueOnce('0x1234');

      mockProvider.getBlock
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any)
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any);

      const result = await analyzeMultipleTransactions(txHashes);

      expect(result.analyses).toHaveLength(2);
      expect(result.aggregate.totalGasUsed).toBe(mockReceipt.gasUsed * 2n);
      expect(result.aggregate.averageGasUsed).toBe(mockReceipt.gasUsed);
      expect(result.aggregate.averageEfficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.aggregate.averageEfficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should handle errors gracefully when analyzing multiple transactions', async () => {
      const txHashes = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x3333333333333333333333333333333333333333333333333333333333333333'
      ];

      mockProvider.getTransactionReceipt
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(null); // Second transaction fails

      mockProvider.getTransaction
        .mockResolvedValueOnce(mockTransaction as any)
        .mockResolvedValueOnce(null);

      mockProvider.getCode
        .mockResolvedValueOnce('0x1234');

      mockProvider.getBlock
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any);

      const result = await analyzeMultipleTransactions(txHashes);

      // Should only have one successful analysis
      expect(result.analyses).toHaveLength(1);
    });

    it('should calculate aggregate statistics correctly', async () => {
      const txHashes = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333333333333333333333333333'
      ];

      // Create receipts with different gas usage
      const receipts = [
        { ...mockReceipt, gasUsed: 100000n } as any,
        { ...mockReceipt, gasUsed: 200000n } as any,
        { ...mockReceipt, gasUsed: 300000n } as any
      ];

      // Each analyzeTransaction call creates a new provider, so we need to mock for each call
      // Since analyzeTransaction is called 3 times, we need 3 sets of mocks
      mockProvider.getTransactionReceipt
        .mockResolvedValueOnce(receipts[0])
        .mockResolvedValueOnce(receipts[1])
        .mockResolvedValueOnce(receipts[2]);

      mockProvider.getTransaction
        .mockResolvedValueOnce(mockTransaction as any)
        .mockResolvedValueOnce(mockTransaction as any)
        .mockResolvedValueOnce(mockTransaction as any);

      mockProvider.getCode
        .mockResolvedValueOnce('0x1234')
        .mockResolvedValueOnce('0x1234')
        .mockResolvedValueOnce('0x1234');

      mockProvider.getBlock
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any)
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any)
        .mockResolvedValueOnce({
          baseFeePerGas: ethers.parseUnits('3', 'gwei')
        } as any);

      const result = await analyzeMultipleTransactions(txHashes);

      expect(result.aggregate.totalGasUsed).toBe(600000n);
      expect(result.aggregate.averageGasUsed).toBe(200000n);
    });
  });

  describe('calculateEfficiencyScore', () => {
    // We need to test this indirectly through analyzeTransaction
    // since it's not exported, but we can verify the score is calculated correctly

    it('should return score between 0 and 100', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt as any);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should give lower score for high gas usage', async () => {
      const lowGasReceipt = { ...mockReceipt, gasUsed: 50000n } as any;
      const highGasReceipt = { ...mockReceipt, gasUsed: 1500000n } as any;

      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      mockProvider.getTransactionReceipt.mockResolvedValue(lowGasReceipt);
      const lowGasResult = await analyzeTransaction(mockTransaction.hash);

      mockProvider.getTransactionReceipt.mockResolvedValue(highGasReceipt);
      const highGasResult = await analyzeTransaction(mockTransaction.hash);

      expect(lowGasResult.efficiencyScore).toBeGreaterThan(highGasResult.efficiencyScore);
    });

    it('should give lower score for more inefficiencies', async () => {
      // Transaction with many logs (inefficiency)
      const manyLogsReceipt = {
        ...mockReceipt,
        logs: Array(30).fill({ address: '0x123', topics: [], data: '0x' })
      } as any;

      mockProvider.getTransactionReceipt.mockResolvedValue(manyLogsReceipt);
      mockProvider.getTransaction.mockResolvedValue(mockTransaction as any);
      mockProvider.getCode.mockResolvedValue('0x1234');
      mockProvider.getBlock.mockResolvedValue({
        baseFeePerGas: ethers.parseUnits('3', 'gwei')
      } as any);

      const result = await analyzeTransaction(mockTransaction.hash);

      // Should have lower score due to inefficiencies
      expect(result.efficiencyScore).toBeLessThan(100);
    });
  });
});


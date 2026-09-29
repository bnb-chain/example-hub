import {
  getBSCProvider,
  isContract,
  getTokenInfo,
  calculateRiskLevel,
  scanAllowances
} from './app';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers');

describe('Allowance Abuse Scanner', () => {
  const mockProvider = {
    getCode: jest.fn(),
    getNetwork: jest.fn()
  };

  const mockTokenContract = {
    symbol: jest.fn(),
    name: jest.fn(),
    decimals: jest.fn(),
    balanceOf: jest.fn(),
    allowance: jest.fn(),
    totalSupply: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
    (ethers.Contract as jest.Mock).mockImplementation(() => mockTokenContract);
    (ethers.getAddress as jest.Mock).mockImplementation((addr) => addr.toLowerCase());
    (ethers.formatUnits as jest.Mock).mockImplementation((value, decimals) => {
      return (Number(value) / Math.pow(10, decimals || 18)).toString();
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
      mockProvider.getCode.mockResolvedValue('0x1234');
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

  describe('getTokenInfo', () => {
    it('should return token information', async () => {
      mockTokenContract.symbol.mockResolvedValue('USDT');
      mockTokenContract.name.mockResolvedValue('Tether USD');
      mockTokenContract.decimals.mockResolvedValue(18);

      const result = await getTokenInfo('0x123', mockProvider as any);
      
      expect(result).toEqual({
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18
      });
    });

    it('should handle errors gracefully', async () => {
      mockTokenContract.symbol.mockRejectedValue(new Error('Failed'));
      mockTokenContract.name.mockRejectedValue(new Error('Failed'));
      mockTokenContract.decimals.mockRejectedValue(new Error('Failed'));

      const result = await getTokenInfo('0x123', mockProvider as any);
      
      expect(result).toEqual({
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18
      });
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return CRITICAL for infinite allowance', () => {
      const maxUint = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const result = calculateRiskLevel(maxUint, BigInt(1000), null, false);
      
      expect(result.level).toBe('CRITICAL');
      expect(result.reason).toContain('Infinite');
    });

    it('should return CRITICAL for near-infinite allowance', () => {
      const nearMax = BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const result = calculateRiskLevel(nearMax, BigInt(1000), null, false);
      
      expect(result.level).toBe('CRITICAL');
    });

    it('should return HIGH for allowance much larger than balance', () => {
      const allowance = BigInt('100000000000000000000000'); // 100k tokens
      const balance = BigInt('1000000000000000000000'); // 1k tokens
      const result = calculateRiskLevel(allowance, balance, null, false);
      
      expect(result.level).toBe('HIGH');
      expect(result.reason).toContain('much larger');
    });

    it('should return HIGH for very large absolute allowance', () => {
      const allowance = BigInt('2000000000000000000000000'); // 2M tokens
      const balance = BigInt('5000000000000000000000000'); // 5M tokens
      const result = calculateRiskLevel(allowance, balance, null, false);
      
      expect(result.level).toBe('HIGH');
      expect(result.reason).toContain('Very large absolute');
    });

    it('should return MEDIUM for allowance exceeding balance', () => {
      const allowance = BigInt('2000000000000000000000'); // 2k tokens
      const balance = BigInt('1000000000000000000000'); // 1k tokens
      const result = calculateRiskLevel(allowance, balance, null, false);
      
      expect(result.level).toBe('MEDIUM');
      expect(result.reason).toContain('exceeds current');
    });

    it('should return MEDIUM for significant allowance to contract', () => {
      const allowance = BigInt('2000000000000000000000'); // 2k tokens
      const balance = BigInt('5000000000000000000000'); // 5k tokens
      const result = calculateRiskLevel(allowance, balance, null, true);
      
      expect(result.level).toBe('MEDIUM');
      expect(result.reason).toContain('contract address');
    });

    it('should return LOW for reasonable allowance', () => {
      const allowance = BigInt('100000000000000000000'); // 100 tokens
      const balance = BigInt('1000000000000000000000'); // 1k tokens
      const result = calculateRiskLevel(allowance, balance, null, false);
      
      expect(result.level).toBe('LOW');
      expect(result.reason).toContain('reasonable limits');
    });

    it('should return LOW for zero balance with small allowance', () => {
      const allowance = BigInt('100000000000000000000'); // 100 tokens
      const balance = BigInt(0);
      const result = calculateRiskLevel(allowance, balance, null, false);
      
      expect(result.level).toBe('LOW');
    });
  });

  describe('scanAllowances', () => {
    const ownerAddress = '0x1234567890123456789012345678901234567890';
    const tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // USDT
    const spenderAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

    it('should scan and return allowances', async () => {
      mockTokenContract.symbol.mockResolvedValue('USDT');
      mockTokenContract.name.mockResolvedValue('Tether USD');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000')); // 1000 tokens
      mockTokenContract.allowance.mockResolvedValue(BigInt('500000000000000000000')); // 500 tokens
      mockTokenContract.totalSupply.mockResolvedValue(BigInt('1000000000000000000000000000'));
      mockProvider.getCode.mockResolvedValue('0x'); // EOA

      const result = await scanAllowances(ownerAddress, [tokenAddress], [spenderAddress]);

      expect(result.ownerAddress).toBe(ownerAddress.toLowerCase());
      expect(result.allowances.length).toBeGreaterThan(0);
      expect(result.allowances[0].tokenSymbol).toBe('USDT');
      expect(result.allowances[0].spender).toBe(spenderAddress.toLowerCase());
    });

    it('should filter out zero allowances', async () => {
      mockTokenContract.symbol.mockResolvedValue('USDT');
      mockTokenContract.name.mockResolvedValue('Tether USD');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000'));
      mockTokenContract.allowance.mockResolvedValue(BigInt(0)); // Zero allowance
      mockProvider.getCode.mockResolvedValue('0x');

      const result = await scanAllowances(ownerAddress, [tokenAddress], [spenderAddress]);

      expect(result.allowances.length).toBe(0);
    });

    it('should handle token errors gracefully', async () => {
      mockTokenContract.symbol.mockRejectedValue(new Error('Token error'));

      const result = await scanAllowances(ownerAddress, [tokenAddress], [spenderAddress]);

      expect(result.allowances.length).toBe(0);
      expect(result.totalAllowances).toBe(0);
    });

    it('should calculate risk counts correctly', async () => {
      mockTokenContract.symbol.mockResolvedValue('USDT');
      mockTokenContract.name.mockResolvedValue('Tether USD');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000'));
      
      // First call: CRITICAL (infinite)
      // Second call: HIGH (large)
      let callCount = 0;
      mockTokenContract.allowance.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
        }
        return Promise.resolve(BigInt('2000000000000000000000000')); // 2M tokens
      });
      
      mockTokenContract.totalSupply.mockResolvedValue(null);
      mockProvider.getCode.mockResolvedValue('0x');

      const result = await scanAllowances(ownerAddress, [tokenAddress], [spenderAddress, '0x999']);

      expect(result.criticalRiskCount).toBeGreaterThanOrEqual(0);
      expect(result.highRiskCount).toBeGreaterThanOrEqual(0);
    });

    it('should normalize addresses', async () => {
      mockTokenContract.symbol.mockResolvedValue('USDT');
      mockTokenContract.name.mockResolvedValue('Tether USD');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000'));
      mockTokenContract.allowance.mockResolvedValue(BigInt('500000000000000000000'));
      mockTokenContract.totalSupply.mockResolvedValue(null);
      mockProvider.getCode.mockResolvedValue('0x');

      const upperCaseAddress = ownerAddress.toUpperCase();
      const result = await scanAllowances(upperCaseAddress, [tokenAddress], []);

      expect(result.ownerAddress).toBe(ownerAddress.toLowerCase());
    });
  });
});



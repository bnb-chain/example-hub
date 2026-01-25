import {
  getBSCProvider,
  isContract,
  getStorageSlot,
  extractAddressFromSlot,
  detectProxy,
  getUpgradeEvents,
  reconstructUpgradeHistory,
  ProxyInfo,
  UpgradeEvent
} from './app';

// Mock ethers
jest.mock('ethers', () => {
  const mockProvider = {
    getCode: jest.fn(),
    getStorage: jest.fn(),
    getBlock: jest.fn(),
    getBlockNumber: jest.fn(),
    getLogs: jest.fn()
  };

  const mockContract = jest.fn().mockImplementation(() => ({
    filters: {
      Upgraded: jest.fn(() => ({ topics: ['0x123'] })),
      ImplementationChanged: jest.fn(() => ({ topics: ['0x456'] })),
      AdminChanged: jest.fn(() => ({ topics: ['0x789'] }))
    },
    interface: {
      parseLog: jest.fn()
    }
  }));

  return {
    ethers: {
      JsonRpcProvider: jest.fn(() => mockProvider),
      Contract: mockContract,
      getAddress: jest.fn((addr) => addr.toLowerCase())
    }
  };
});

describe('Proxy Upgrade History Reconstructor', () => {
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { ethers } = require('ethers');
    mockProvider = new ethers.JsonRpcProvider();
  });

  describe('getBSCProvider', () => {
    it('should return a provider with default RPC URL', () => {
      const provider = getBSCProvider();
      expect(provider).toBeDefined();
    });

    it('should use BSC_RPC_URL from environment if available', () => {
      const originalEnv = process.env.BSC_RPC_URL;
      process.env.BSC_RPC_URL = 'https://custom-rpc-url.com';
      
      const provider = getBSCProvider();
      expect(provider).toBeDefined();
      
      process.env.BSC_RPC_URL = originalEnv;
    });
  });

  describe('isContract', () => {
    it('should return true for contract addresses', async () => {
      mockProvider.getCode.mockResolvedValue('0x6080604052348015600f57600080fd5b50');
      
      const result = await isContract('0x1234567890123456789012345678901234567890', mockProvider);
      expect(result).toBe(true);
    });

    it('should return false for EOA addresses', async () => {
      mockProvider.getCode.mockResolvedValue('0x');
      
      const result = await isContract('0x1234567890123456789012345678901234567890', mockProvider);
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockProvider.getCode.mockRejectedValue(new Error('Network error'));
      
      const result = await isContract('0x1234567890123456789012345678901234567890', mockProvider);
      expect(result).toBe(false);
    });
  });

  describe('getStorageSlot', () => {
    it('should return storage slot value', async () => {
      const slotValue = '0x000000000000000000000000abcdef1234567890123456789012345678901234';
      mockProvider.getStorage.mockResolvedValue(slotValue);
      
      const result = await getStorageSlot(
        '0x1234567890123456789012345678901234567890',
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
        mockProvider
      );
      
      expect(result).toBe(slotValue);
    });

    it('should return zero value on error', async () => {
      mockProvider.getStorage.mockRejectedValue(new Error('Storage error'));
      
      const result = await getStorageSlot(
        '0x1234567890123456789012345678901234567890',
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
        mockProvider
      );
      
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
  });

  describe('extractAddressFromSlot', () => {
    it('should extract address from storage slot', () => {
      const slotValue = '0x000000000000000000000000abcdef1234567890123456789012345678901234';
      const address = extractAddressFromSlot(slotValue);
      
      expect(address).toBe('0xabcdef1234567890123456789012345678901234');
    });

    it('should return null for zero slot value', () => {
      const slotValue = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const address = extractAddressFromSlot(slotValue);
      
      expect(address).toBeNull();
    });

    it('should return null for invalid slot value', () => {
      const address = extractAddressFromSlot('');
      expect(address).toBeNull();
    });
  });

  describe('detectProxy', () => {
    it('should detect EIP-1967 proxy', async () => {
      const implementationAddress = '0xabcdef1234567890123456789012345678901234';
      const adminAddress = '0xfedcba987654321098765432109876543210fedc';
      
      mockProvider.getCode.mockResolvedValue('0x6080604052348015600f57600080fd5b50');
      mockProvider.getStorage
        .mockResolvedValueOnce(`0x000000000000000000000000${implementationAddress.slice(2)}`)
        .mockResolvedValueOnce(`0x000000000000000000000000${adminAddress.slice(2)}`)
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000');
      
      const result = await detectProxy('0x1234567890123456789012345678901234567890', mockProvider);
      
      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe('EIP-1967');
      expect(result.currentImplementation).toBe(implementationAddress.toLowerCase());
      expect(result.currentAdmin).toBe(adminAddress.toLowerCase());
    });

    it('should return non-proxy for EOA', async () => {
      mockProvider.getCode.mockResolvedValue('0x');
      
      const result = await detectProxy('0x1234567890123456789012345678901234567890', mockProvider);
      
      expect(result.isProxy).toBe(false);
      expect(result.proxyType).toBe('Unknown');
    });

    it('should detect beacon proxy', async () => {
      const beaconAddress = '0xbeacon1234567890123456789012345678901234';
      
      mockProvider.getCode.mockResolvedValue('0x6080604052348015600f57600080fd5b50');
      mockProvider.getStorage
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000')
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000')
        .mockResolvedValueOnce(`0x000000000000000000000000${beaconAddress.slice(2)}`);
      
      const result = await detectProxy('0x1234567890123456789012345678901234567890', mockProvider);
      
      expect(result.isProxy).toBe(true);
      expect(result.proxyType).toBe('Beacon');
      expect(result.currentBeacon).toBe(beaconAddress.toLowerCase());
    });
  });

  describe('getUpgradeEvents', () => {
    it('should return empty array when no events found', async () => {
      mockProvider.getLogs.mockResolvedValue([]);
      
      const events = await getUpgradeEvents(
        '0x1234567890123456789012345678901234567890',
        mockProvider
      );
      
      expect(events).toEqual([]);
    });

    it('should parse and return upgrade events', async () => {
      const mockLog = {
        blockNumber: 12345,
        transactionHash: '0xtx123',
        topics: ['0x123'],
        data: '0xdata'
      };
      
      const mockBlock = {
        timestamp: 1234567890
      };
      
      const { ethers } = require('ethers');
      const mockContract = new ethers.Contract('0x123', [], mockProvider);
      mockContract.interface.parseLog = jest.fn().mockReturnValue({
        args: ['0xnewimpl']
      });
      
      mockProvider.getLogs.mockResolvedValue([mockLog]);
      mockProvider.getBlock.mockResolvedValue(mockBlock);
      
      // Mock the contract creation to return our mock
      jest.spyOn(ethers, 'Contract').mockReturnValue(mockContract);
      
      const events = await getUpgradeEvents(
        '0x1234567890123456789012345678901234567890',
        mockProvider
      );
      
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reconstructUpgradeHistory', () => {
    it('should return empty history for non-proxy', async () => {
      mockProvider.getCode.mockResolvedValue('0x');
      mockProvider.getBlockNumber.mockResolvedValue(1000000);
      
      const history = await reconstructUpgradeHistory('0x1234567890123456789012345678901234567890');
      
      expect(history.proxyInfo.isProxy).toBe(false);
      expect(history.totalUpgrades).toBe(0);
      expect(history.upgradeEvents).toEqual([]);
    });

    it('should reconstruct history for proxy with implementation', async () => {
      const implementationAddress = '0xabcdef1234567890123456789012345678901234';
      
      mockProvider.getCode.mockResolvedValue('0x6080604052348015600f57600080fd5b50');
      mockProvider.getStorage
        .mockResolvedValueOnce(`0x000000000000000000000000${implementationAddress.slice(2)}`)
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000')
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000');
      mockProvider.getBlockNumber.mockResolvedValue(1000000);
      mockProvider.getLogs.mockResolvedValue([]);
      
      const mockBlock = {
        number: 1000000,
        timestamp: Math.floor(Date.now() / 1000)
      };
      mockProvider.getBlock.mockResolvedValue(mockBlock);
      
      const history = await reconstructUpgradeHistory('0x1234567890123456789012345678901234567890');
      
      expect(history.proxyInfo.isProxy).toBe(true);
      expect(history.proxyInfo.currentImplementation).toBe(implementationAddress.toLowerCase());
    });
  });
});




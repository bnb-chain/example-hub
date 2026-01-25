import {
  isEmptySlot,
  getBSCProvider
} from './app';

describe('State Growth Inspector - Utility Functions', () => {
  describe('isEmptySlot', () => {
    it('should return true for empty slot (all zeros)', () => {
      expect(isEmptySlot('0x0000000000000000000000000000000000000000000000000000000000000000')).toBe(true);
      expect(isEmptySlot('0x0')).toBe(true);
      expect(isEmptySlot('0x')).toBe(true);
      expect(isEmptySlot('0x0000')).toBe(true);
    });

    it('should return false for non-empty slot', () => {
      expect(isEmptySlot('0x0000000000000000000000000000000000000000000000000000000000000001')).toBe(false);
      expect(isEmptySlot('0x1234567890abcdef')).toBe(false);
      expect(isEmptySlot('0x00000000000000000000000000000000000000000000000000000000000000ff')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isEmptySlot('')).toBe(true);
    });
  });

  describe('getBSCProvider', () => {
    it('should create a provider with default RPC URL', () => {
      const originalEnv = process.env.BSC_RPC_URL;
      delete process.env.BSC_RPC_URL;
      
      const provider = getBSCProvider();
      expect(provider).toBeDefined();
      
      if (originalEnv) {
        process.env.BSC_RPC_URL = originalEnv;
      }
    });

    it('should use BSC_RPC_URL from environment if available', () => {
      const originalEnv = process.env.BSC_RPC_URL;
      process.env.BSC_RPC_URL = 'https://custom-rpc.url';
      
      const provider = getBSCProvider();
      expect(provider).toBeDefined();
      
      process.env.BSC_RPC_URL = originalEnv || 'https://bsc-dataseed1.binance.org/';
    });
  });
});

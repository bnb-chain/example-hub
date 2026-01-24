import {
  analyzeABI,
  calculateComplexityScore,
  identifyRiskFactors,
  getCommonContractABI,
  checkProxy,
  isContract
} from './app';
import { ethers } from 'ethers';

describe('Contract Surface Area Analyzer', () => {
  describe('analyzeABI', () => {
    it('should extract functions from ABI', () => {
      const abi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function balanceOf(address account) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)'
      ];

      const result = analyzeABI(abi);

      expect(result.functions).toHaveLength(3);
      expect(result.functions[0].name).toBe('transfer');
      // In ethers v6, visibility is not available on FunctionFragment, defaults to 'public'
      expect(result.functions[0].visibility).toBe('public');
      expect(result.functions[0].stateMutability).toBe('nonpayable');
      expect(result.functions[1].name).toBe('balanceOf');
      expect(result.functions[1].stateMutability).toBe('view');
    });

    it('should extract events from ABI', () => {
      const abi = [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)'
      ];

      const result = analyzeABI(abi);

      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('Transfer');
      expect(result.events[0].inputs).toHaveLength(3);
      expect(result.events[0].inputs[0].indexed).toBe(true);
    });

    it('should detect fallback function', () => {
      const abi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'fallback() external payable'
      ];

      const result = analyzeABI(abi);

      expect(result.hasFallback).toBe(true);
      expect(result.hasReceive).toBe(false);
    });

    it('should detect receive function', () => {
      const abi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'receive() external payable'
      ];

      const result = analyzeABI(abi);

      expect(result.hasReceive).toBe(true);
      expect(result.hasFallback).toBe(false);
    });

    it('should handle payable functions', () => {
      const abi = [
        'function deposit() external payable',
        'function withdraw(uint256 amount) external'
      ];

      const result = analyzeABI(abi);

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].stateMutability).toBe('payable');
      expect(result.functions[1].stateMutability).toBe('nonpayable');
    });

    it('should handle empty ABI', () => {
      const result = analyzeABI([]);

      expect(result.functions).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.hasFallback).toBe(false);
      expect(result.hasReceive).toBe(false);
    });

    it('should handle invalid ABI gracefully', () => {
      const invalidAbi = ['invalid abi string'];

      const result = analyzeABI(invalidAbi);

      // Should not throw, but may return empty results
      expect(result).toBeDefined();
    });
  });

  describe('calculateComplexityScore', () => {
    it('should calculate base complexity from functions', () => {
      const score = calculateComplexityScore({
        totalFunctions: 10,
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 0,
        totalEvents: 0,
        hasFallback: false,
        hasReceive: false
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBe(10 * 2 + 5 * 3 + 5 * 3); // 20 + 15 + 15 = 50
    });

    it('should add points for payable functions', () => {
      const score = calculateComplexityScore({
        totalFunctions: 5,
        publicFunctions: 2,
        externalFunctions: 3,
        payableFunctions: 2,
        totalEvents: 0,
        hasFallback: false,
        hasReceive: false
      });

      expect(score).toBe(5 * 2 + 2 * 3 + 3 * 3 + 2 * 5); // 10 + 6 + 9 + 10 = 35
    });

    it('should add significant points for fallback and receive', () => {
      const scoreWithFallback = calculateComplexityScore({
        totalFunctions: 5,
        publicFunctions: 2,
        externalFunctions: 3,
        payableFunctions: 0,
        totalEvents: 0,
        hasFallback: true,
        hasReceive: false
      });

      const scoreWithout = calculateComplexityScore({
        totalFunctions: 5,
        publicFunctions: 2,
        externalFunctions: 3,
        payableFunctions: 0,
        totalEvents: 0,
        hasFallback: false,
        hasReceive: false
      });

      expect(scoreWithFallback - scoreWithout).toBe(10);
    });

    it('should include events in score', () => {
      const score = calculateComplexityScore({
        totalFunctions: 5,
        publicFunctions: 2,
        externalFunctions: 3,
        payableFunctions: 0,
        totalEvents: 3,
        hasFallback: false,
        hasReceive: false
      });

      expect(score).toBe(5 * 2 + 2 * 3 + 3 * 3 + 3 * 1); // 10 + 6 + 9 + 3 = 28
    });
  });

  describe('identifyRiskFactors', () => {
    it('should identify high number of public functions as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 25,
        externalFunctions: 5,
        payableFunctions: 2,
        hasFallback: false,
        hasReceive: false,
        isProxy: false
      });

      expect(risks.length).toBeGreaterThan(0);
      expect(risks.some(r => r.includes('High number of public functions'))).toBe(true);
    });

    it('should identify high number of external functions as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 20,
        payableFunctions: 2,
        hasFallback: false,
        hasReceive: false,
        isProxy: false
      });

      expect(risks.some(r => r.includes('Many external functions'))).toBe(true);
    });

    it('should identify multiple payable functions as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 8,
        hasFallback: false,
        hasReceive: false,
        isProxy: false
      });

      expect(risks.some(r => r.includes('Multiple payable functions'))).toBe(true);
    });

    it('should identify fallback function as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 0,
        hasFallback: true,
        hasReceive: false,
        isProxy: false
      });

      expect(risks.some(r => r.includes('Fallback function'))).toBe(true);
    });

    it('should identify receive function as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 0,
        hasFallback: false,
        hasReceive: true,
        isProxy: false
      });

      expect(risks.some(r => r.includes('Receive function'))).toBe(true);
    });

    it('should identify proxy pattern as risk', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 0,
        hasFallback: false,
        hasReceive: false,
        isProxy: true
      });

      expect(risks.some(r => r.includes('Proxy pattern'))).toBe(true);
    });

    it('should return no significant risks for safe contracts', () => {
      const risks = identifyRiskFactors({
        publicFunctions: 5,
        externalFunctions: 5,
        payableFunctions: 1,
        hasFallback: false,
        hasReceive: false,
        isProxy: false
      });

      expect(risks.some(r => r.includes('No significant risk factors'))).toBe(true);
    });
  });

  describe('getCommonContractABI', () => {
    it('should return ERC20 ABI', () => {
      const abi = getCommonContractABI('ERC20');

      // InterfaceAbi can be string or array, check if it's an array
      const abiArray = Array.isArray(abi) ? abi : JSON.parse(abi as string);
      expect(abiArray.length).toBeGreaterThan(0);
      
      // Convert to string for searching if needed
      const abiString = Array.isArray(abi) ? JSON.stringify(abi) : abi as string;
      expect(abiString.includes('transfer')).toBe(true);
      expect(abiString.includes('approve')).toBe(true);
    });

    it('should return ERC721 ABI', () => {
      const abi = getCommonContractABI('ERC721');

      const abiArray = Array.isArray(abi) ? abi : JSON.parse(abi as string);
      expect(abiArray.length).toBeGreaterThan(0);
      
      const abiString = Array.isArray(abi) ? JSON.stringify(abi) : abi as string;
      expect(abiString.includes('transferFrom')).toBe(true);
      expect(abiString.includes('ownerOf')).toBe(true);
    });

    it('should return Uniswap V2 ABI', () => {
      const abi = getCommonContractABI('UNISWAP_V2');

      const abiArray = Array.isArray(abi) ? abi : JSON.parse(abi as string);
      expect(abiArray.length).toBeGreaterThan(0);
      
      const abiString = Array.isArray(abi) ? JSON.stringify(abi) : abi as string;
      expect(abiString.includes('swapExactTokensForTokens')).toBe(true);
    });

    it('should return empty array for unknown type', () => {
      const abi = getCommonContractABI('UNKNOWN' as any);

      expect(abi).toEqual([]);
    });
  });

  describe('checkProxy', () => {
    // Note: These tests would require mocking the provider
    // For now, we'll test the logic structure
    it('should have checkProxy function defined', () => {
      expect(typeof checkProxy).toBe('function');
    });
  });

  describe('isContract', () => {
    // Note: These tests would require mocking the provider
    it('should have isContract function defined', () => {
      expect(typeof isContract).toBe('function');
    });
  });
});



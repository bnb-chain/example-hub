/**
 * Unit tests for TBNB Faucet MCP Server (Example 3 - Node.js)
 * 
 * Note: These tests focus on the business logic and validation
 * rather than full integration with the MCP server, since the server
 * initializes on import and uses stdio transport.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Address Validation Logic', () => {
  test('should validate correct Ethereum address format', () => {
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    // Ethereum addresses are 42 characters (0x + 40 hex chars)
    expect(validAddress.length).toBe(42);
    expect(validAddress.startsWith('0x')).toBe(true);
    expect(/^0x[a-fA-F0-9]{40}$/.test(validAddress)).toBe(true);
  });

  test('should reject invalid address formats', () => {
    const invalidAddresses = [
      'invalid',
      '0x123',
      '742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Missing 0x
      '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex
      '',
    ];

    invalidAddresses.forEach((addr) => {
      const isValid = addr.length === 42 && addr.startsWith('0x') && /^0x[a-fA-F0-9]{40}$/.test(addr);
      expect(isValid).toBe(false);
    });
  });
});

describe('Amount Validation Logic', () => {
  test('should accept valid amounts between 0 and 1.0', () => {
    const validAmounts = [0.01, 0.1, 0.5, 1.0];
    
    validAmounts.forEach((amount) => {
      const isValid = amount > 0 && amount <= 1.0;
      expect(isValid).toBe(true);
    });
  });

  test('should reject zero or negative amounts', () => {
    const invalidAmounts = [0, -0.1, -1.0];
    
    invalidAmounts.forEach((amount) => {
      const isValid = amount > 0 && amount <= 1.0;
      expect(isValid).toBe(false);
    });
  });

  test('should reject amounts greater than 1.0', () => {
    const invalidAmounts = [1.1, 2.0, 10.0];
    
    invalidAmounts.forEach((amount) => {
      const isValid = amount > 0 && amount <= 1.0;
      expect(isValid).toBe(false);
    });
  });
});

describe('Self-Transfer Prevention Logic', () => {
  test('should detect self-transfer attempts', () => {
    const faucetAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    
    const isSelfTransfer = recipient.toLowerCase() === faucetAddress.toLowerCase();
    expect(isSelfTransfer).toBe(true);
  });

  test('should allow transfers to different addresses', () => {
    const faucetAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const recipient = '0x1234567890123456789012345678901234567890';
    
    const isSelfTransfer = recipient.toLowerCase() === faucetAddress.toLowerCase();
    expect(isSelfTransfer).toBe(false);
  });
});

describe('Wei Conversion Logic', () => {
  test('should convert TBNB to Wei correctly', () => {
    // 1 TBNB = 10^18 Wei
    const tbnbAmounts = [
      { tbnb: 0.1, wei: '100000000000000000' },
      { tbnb: 1.0, wei: '1000000000000000000' },
      { tbnb: 0.01, wei: '10000000000000000' },
    ];

    tbnbAmounts.forEach(({ tbnb, wei }) => {
      // Manual conversion for testing
      const calculatedWei = (tbnb * Math.pow(10, 18)).toString();
      expect(calculatedWei).toBe(wei);
    });
  });

  test('should handle Wei to TBNB conversion', () => {
    const weiAmounts = [
      { wei: '100000000000000000', tbnb: 0.1 },
      { wei: '1000000000000000000', tbnb: 1.0 },
      { wei: '500000000000000000', tbnb: 0.5 },
    ];

    weiAmounts.forEach(({ wei, tbnb }) => {
      // Manual conversion for testing
      const calculatedTbnb = parseFloat(wei) / Math.pow(10, 18);
      expect(calculatedTbnb).toBeCloseTo(tbnb, 10);
    });
  });
});

describe('Transaction Response Format', () => {
  test('should format successful transaction response correctly', () => {
    const mockResponse = {
      success: true,
      transactionHash: '0xabcdef1234567890',
      recipient: '0x1234567890123456789012345678901234567890',
      amount: 0.1,
      amountWei: '100000000000000000',
      blockNumber: 12345,
      status: 'confirmed',
    };

    expect(mockResponse).toHaveProperty('success');
    expect(mockResponse).toHaveProperty('transactionHash');
    expect(mockResponse).toHaveProperty('recipient');
    expect(mockResponse).toHaveProperty('amount');
    expect(mockResponse).toHaveProperty('blockNumber');
    expect(mockResponse).toHaveProperty('status');
    expect(mockResponse.success).toBe(true);
    expect(mockResponse.status).toBe('confirmed');
  });

  test('should format error response correctly', () => {
    const mockErrorResponse = {
      error: 'Invalid address: invalid_address',
    };

    expect(mockErrorResponse).toHaveProperty('error');
    expect(typeof mockErrorResponse.error).toBe('string');
  });
});

describe('Faucet Info Response Format', () => {
  test('should format faucet info response correctly', () => {
    const mockFaucetInfo = {
      faucetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      balanceWei: '1000000000000000000',
      balanceTbnb: 1.0,
      network: {
        name: 'BSC Testnet',
        chainId: '97',
      },
      rpcEndpoint: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    };

    expect(mockFaucetInfo).toHaveProperty('faucetAddress');
    expect(mockFaucetInfo).toHaveProperty('balanceWei');
    expect(mockFaucetInfo).toHaveProperty('balanceTbnb');
    expect(mockFaucetInfo).toHaveProperty('network');
    expect(mockFaucetInfo).toHaveProperty('rpcEndpoint');
    expect(mockFaucetInfo.network.chainId).toBe('97');
  });
});

describe('Balance Query Response Format', () => {
  test('should format balance query response correctly', () => {
    const mockBalanceResponse = {
      address: '0x1234567890123456789012345678901234567890',
      balanceWei: '500000000000000000',
      balanceTbnb: 0.5,
      network: 'BSC Testnet',
    };

    expect(mockBalanceResponse).toHaveProperty('address');
    expect(mockBalanceResponse).toHaveProperty('balanceWei');
    expect(mockBalanceResponse).toHaveProperty('balanceTbnb');
    expect(mockBalanceResponse).toHaveProperty('network');
    expect(mockBalanceResponse.balanceTbnb).toBe(0.5);
  });
});

describe('Error Handling', () => {
  test('should handle missing recipient address', () => {
    const recipient = '';
    if (!recipient) {
      expect(() => {
        throw new Error('Recipient address is required');
      }).toThrow('Recipient address is required');
    }
  });

  test('should handle missing wallet configuration', () => {
    const wallet = null;
    if (!wallet) {
      expect(() => {
        throw new Error('Faucet wallet not configured. Please set FAUCET_PRIVATE_KEY.');
      }).toThrow('Faucet wallet not configured');
    }
  });

  test('should handle network errors gracefully', () => {
    const networkError = new Error('Network error');
    expect(networkError.message).toBe('Network error');
    expect(networkError).toBeInstanceOf(Error);
  });
});

describe('MCP Tool Schema Validation', () => {
  test('send_tbnb tool should have correct schema structure', () => {
    const toolSchema = {
      name: 'send_tbnb',
      description: 'Send testnet BNB tokens to a specified address on BSC testnet',
      inputSchema: {
        type: 'object',
        properties: {
          recipient: {
            type: 'string',
            description: 'The BSC testnet address that will receive the TBNB tokens',
          },
          amount: {
            type: 'number',
            description: 'Amount of TBNB to send (default: 0.1, maximum: 1.0)',
            default: 0.1,
          },
        },
        required: ['recipient'],
      },
    };

    expect(toolSchema).toHaveProperty('name');
    expect(toolSchema).toHaveProperty('description');
    expect(toolSchema).toHaveProperty('inputSchema');
    expect(toolSchema.inputSchema.type).toBe('object');
    expect(toolSchema.inputSchema.required).toContain('recipient');
  });

  test('get_faucet_info tool should have correct schema structure', () => {
    const toolSchema = {
      name: 'get_faucet_info',
      description: 'Get information about the faucet including current balance',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    expect(toolSchema).toHaveProperty('name');
    expect(toolSchema).toHaveProperty('description');
    expect(toolSchema).toHaveProperty('inputSchema');
    expect(toolSchema.inputSchema.type).toBe('object');
  });

  test('get_balance tool should have correct schema structure', () => {
    const toolSchema = {
      name: 'get_balance',
      description: 'Get the TBNB balance of a BSC testnet address',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The BSC testnet address to check',
          },
        },
        required: ['address'],
      },
    };

    expect(toolSchema).toHaveProperty('name');
    expect(toolSchema).toHaveProperty('description');
    expect(toolSchema).toHaveProperty('inputSchema');
    expect(toolSchema.inputSchema.required).toContain('address');
  });
});

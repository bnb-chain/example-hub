import { ethers } from 'ethers';
import {
  createTransaction,
  serializeTransaction,
  canReplayTransaction,
  getTransactionDetails,
  NETWORKS
} from './app';

describe('Replay Attack Demonstrator', () => {
  describe('createTransaction', () => {
    it('should create a transaction with correct parameters', () => {
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '1.0',
        56,
        0,
        '21000',
        '20000000000'
      );

      expect(tx.to).toBe('0x2222222222222222222222222222222222222222');
      expect(tx.value).toBe(ethers.parseEther('1.0'));
      expect(tx.chainId).toBe(56);
      expect(tx.nonce).toBe(0);
      expect(tx.gasLimit).toBe('21000');
      expect(tx.gasPrice).toBe('20000000000');
      expect(tx.type).toBe(0);
    });

    it('should use default values when optional parameters are not provided', () => {
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '0.5',
        97
      );

      expect(tx.nonce).toBe(0);
      expect(tx.gasLimit).toBe('21000');
      expect(tx.gasPrice).toBe('20000000000');
    });
  });

  describe('serializeTransaction', () => {
    it('should serialize a signed transaction hex string', async () => {
      // Create a mock signed transaction hex
      const wallet = ethers.Wallet.createRandom();
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '0.1',
        56
      );

      // This will create a signed transaction
      const signedTx = await wallet.signTransaction(tx);
      const parsed = serializeTransaction(signedTx);
      expect(parsed).toBeInstanceOf(ethers.Transaction);
      expect(parsed.to).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('canReplayTransaction', () => {
    it('should detect that transaction with chainId protection cannot be replayed on different network', async () => {
      const wallet = ethers.Wallet.createRandom();
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '0.1',
        56 // BSC Mainnet
      );

      const signedTx = await wallet.signTransaction(tx);
      const parsed = serializeTransaction(signedTx);

      const result = canReplayTransaction(56, 1, parsed); // Try to replay on Ethereum Mainnet

      expect(result.canReplay).toBe(false);
      expect(result.reason).toContain('protected by chainId');
    });

    it('should detect that transaction can be replayed on same network', async () => {
      const wallet = ethers.Wallet.createRandom();
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '0.1',
        56 // BSC Mainnet
      );

      const signedTx = await wallet.signTransaction(tx);
      const parsed = serializeTransaction(signedTx);

      const result = canReplayTransaction(56, 56, parsed); // Same network

      expect(result.canReplay).toBe(true);
      expect(result.reason).toContain('matches target network');
    });
  });

  describe('getTransactionDetails', () => {
    it('should extract transaction details from signed transaction hex', async () => {
      const wallet = ethers.Wallet.createRandom();
      const tx = createTransaction(
        '0x2222222222222222222222222222222222222222',
        '0.5',
        56
      );

      const signedTx = await wallet.signTransaction(tx);
      const details = getTransactionDetails(signedTx);

      expect(details.transaction).toBeInstanceOf(ethers.Transaction);
      expect(details.to).toBe('0x2222222222222222222222222222222222222222');
      expect(details.value).toBe('0.5');
      expect(details.chainId).toBe(56);
      expect(details.from).toBeDefined();
    });
  });

  describe('NETWORKS', () => {
    it('should have correct network configurations', () => {
      expect(NETWORKS['bsc-mainnet']).toBeDefined();
      expect(NETWORKS['bsc-mainnet'].chainId).toBe(56);
      expect(NETWORKS['bsc-mainnet'].name).toBe('BSC Mainnet');

      expect(NETWORKS['bsc-testnet']).toBeDefined();
      expect(NETWORKS['bsc-testnet'].chainId).toBe(97);

      expect(NETWORKS['eth-mainnet']).toBeDefined();
      expect(NETWORKS['eth-mainnet'].chainId).toBe(1);

      expect(NETWORKS['eth-sepolia']).toBeDefined();
      expect(NETWORKS['eth-sepolia'].chainId).toBe(11155111);
    });
  });
});

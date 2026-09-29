import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ReplayAttackDemo {
  originalNetwork: string;
  targetNetwork: string;
  transaction: {
    to: string;
    value: string;
    data: string;
    nonce: number;
    gasLimit: string;
    gasPrice: string;
    chainId: number;
  };
  signature: {
    r: string;
    s: string;
    v: number;
  };
  canReplay: boolean;
  replayReason: string;
}

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORKS: Record<string, NetworkInfo> = {
  'bsc-mainnet': {
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/',
    explorerUrl: 'https://bscscan.com'
  },
  'bsc-testnet': {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    explorerUrl: 'https://testnet.bscscan.com'
  }
};

/**
 * Get provider for a specific network
 */
export function getProvider(networkKey: string): ethers.Provider {
  const network = NETWORKS[networkKey];
  if (!network) {
    throw new Error(`Unknown network: ${networkKey}`);
  }
  return new ethers.JsonRpcProvider(network.rpcUrl);
}

/**
 * Create a transaction object for signing
 */
export function createTransaction(
  to: string,
  value: string,
  chainId: number,
  nonce: number = 0,
  gasLimit: string = '21000',
  gasPrice: string = '20000000000'
): ethers.TransactionRequest {
  return {
    to,
    value: ethers.parseEther(value),
    chainId,
    nonce,
    gasLimit,
    gasPrice,
    type: 0 // Legacy transaction
  };
}

/**
 * Sign a transaction with a private key
 */
export async function signTransaction(
  transaction: ethers.TransactionRequest,
  privateKey: string
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  return await wallet.signTransaction(transaction);
}

/**
 * Serialize a signed transaction
 */
export function serializeTransaction(signedTx: string): ethers.Transaction {
  return ethers.Transaction.from(signedTx);
}

/**
 * Check if a transaction can be replayed on a different network
 */
export function canReplayTransaction(
  originalChainId: number,
  targetChainId: number,
  transaction: ethers.Transaction
): { canReplay: boolean; reason: string } {
  // Transactions with chainId protection cannot be replayed
  if (transaction.chainId !== null && transaction.chainId !== undefined) {
    const txChainId = Number(transaction.chainId);
    if (txChainId !== targetChainId) {
      return {
        canReplay: false,
        reason: `Transaction is protected by chainId (${txChainId}). Cannot replay on network with chainId ${targetChainId}.`
      };
    }
    return {
      canReplay: true,
      reason: `Transaction chainId (${txChainId}) matches target network. Transaction can be replayed.`
    };
  }

  // Legacy transactions without chainId can potentially be replayed
  return {
    canReplay: true,
    reason: 'Legacy transaction without chainId protection. Can be replayed on any network.'
  };
}

/**
 * Attempt to replay a transaction on a different network
 */
export async function attemptReplay(
  signedTransaction: string,
  originalNetworkKey: string,
  targetNetworkKey: string
): Promise<{
  success: boolean;
  reason: string;
  transaction?: ethers.Transaction;
}> {
  const originalNetwork = NETWORKS[originalNetworkKey];
  const targetNetwork = NETWORKS[targetNetworkKey];

  if (!originalNetwork || !targetNetwork) {
    return {
      success: false,
      reason: 'Invalid network specified'
    };
  }

  try {
    const transaction = serializeTransaction(signedTransaction);

    // Check if replay is possible
    const replayCheck = canReplayTransaction(
      originalNetwork.chainId,
      targetNetwork.chainId,
      transaction
    );

    if (!replayCheck.canReplay) {
      return {
        success: false,
        reason: replayCheck.reason,
        transaction
      };
    }

    // If chainId matches, the transaction could theoretically be replayed
    // In a real scenario, you would broadcast it to the network
    // For demonstration, we just check if it's possible
    return {
      success: true,
      reason: replayCheck.reason,
      transaction
    };
  } catch (error) {
    return {
      success: false,
      reason: `Error parsing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create a demonstration of replay attack scenario
 */
export async function demonstrateReplayAttack(
  fromAddress: string,
  toAddress: string,
  value: string,
  originalNetworkKey: string,
  targetNetworkKey: string,
  privateKey?: string
): Promise<ReplayAttackDemo> {
  const originalNetwork = NETWORKS[originalNetworkKey];
  const targetNetwork = NETWORKS[targetNetworkKey];

  if (!originalNetwork || !targetNetwork) {
    throw new Error('Invalid network specified');
  }

  // Create transaction for original network
  const transaction = createTransaction(
    toAddress,
    value,
    originalNetwork.chainId,
    0,
    '21000',
    '20000000000'
  );

  let signedTx: string;
  let parsedTx: ethers.Transaction;

  if (privateKey) {
    // Sign the transaction
    signedTx = await signTransaction(transaction, privateKey);
    parsedTx = serializeTransaction(signedTx);
  } else {
    // For demo purposes, create a mock signed transaction
    // In reality, you need a private key to sign
    const wallet = ethers.Wallet.createRandom();
    const mockTx = createTransaction(
      toAddress,
      value,
      originalNetwork.chainId,
      0,
      '21000',
      '20000000000'
    );
    signedTx = await wallet.signTransaction(mockTx);
    parsedTx = serializeTransaction(signedTx);
  }

  // Check if replay is possible
  const replayCheck = canReplayTransaction(
    originalNetwork.chainId,
    targetNetwork.chainId,
    parsedTx
  );

  return {
    originalNetwork: originalNetwork.name,
    targetNetwork: targetNetwork.name,
    transaction: {
      to: parsedTx.to || '',
      value: ethers.formatEther(parsedTx.value),
      data: parsedTx.data || '0x',
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit?.toString() || '0',
      gasPrice: parsedTx.gasPrice?.toString() || '0',
      chainId: parsedTx.chainId ? Number(parsedTx.chainId) : 0
    },
    signature: {
      r: parsedTx.signature?.r || '0x',
      s: parsedTx.signature?.s || '0x',
      v: parsedTx.signature?.v || 0
    },
    canReplay: replayCheck.canReplay,
    replayReason: replayCheck.reason
  };
}

/**
 * Get transaction details from a signed transaction hex
 */
export function getTransactionDetails(signedTxHex: string): {
  transaction: ethers.Transaction;
  from: string;
  to: string;
  value: string;
  chainId: number | null;
} {
  const tx = serializeTransaction(signedTxHex);
  const from = tx.from || 'Unknown';
  
  return {
    transaction: tx,
    from,
    to: tx.to || '',
    value: ethers.formatEther(tx.value),
    chainId: tx.chainId ? Number(tx.chainId) : null
  };
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const fromAddress = process.env.FROM_ADDRESS || process.argv[2];
  const toAddress = process.env.TO_ADDRESS || process.argv[3];
  const value = process.env.VALUE || process.argv[4];
  const originalNetwork = process.env.ORIGINAL_NETWORK || process.argv[5];
  const targetNetwork = process.env.TARGET_NETWORK || process.argv[6] || 'bsc-mainnet';
  const privateKey = process.env.PRIVATE_KEY || process.argv[7];
  
  if (!fromAddress || !toAddress || !value || !originalNetwork) {
    console.error('Usage: npm start [from-address] [to-address] [value-in-bnb] [original-network] [target-network] [private-key]');
    console.error('Or set FROM_ADDRESS, TO_ADDRESS, VALUE, ORIGINAL_NETWORK, TARGET_NETWORK, PRIVATE_KEY in .env file');
    console.error('Networks: bsc-mainnet, bsc-testnet');
    process.exit(1);
  }

  console.log('Replay Attack Demonstrator');
  console.log('==========================\n');
  console.log(`From: ${fromAddress}`);
  console.log(`To: ${toAddress}`);
  console.log(`Value: ${value} BNB`);
  console.log(`Original Network: ${originalNetwork}`);
  console.log(`Target Network: ${targetNetwork}\n`);

  try {
    const demo = await demonstrateReplayAttack(
      fromAddress,
      toAddress,
      value,
      originalNetwork,
      targetNetwork,
      privateKey
    );

    console.log('Transaction Details:');
    console.log(`  To: ${demo.transaction.to}`);
    console.log(`  Value: ${demo.transaction.value} BNB`);
    console.log(`  ChainId: ${demo.transaction.chainId}`);
    console.log(`  Nonce: ${demo.transaction.nonce}\n`);

    console.log('Replay Analysis:');
    console.log(`  Can Replay: ${demo.canReplay ? 'YES ⚠️' : 'NO ✅'}`);
    console.log(`  Reason: ${demo.replayReason}\n`);

    if (demo.canReplay) {
      console.log('⚠️  WARNING: This transaction can be replayed on the target network!');
      console.log('   Always use chainId protection in your transactions.');
    } else {
      console.log('✅ This transaction is protected against replay attacks.');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}



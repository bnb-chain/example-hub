import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';
import { http as wagmiHttp } from 'wagmi';
import { createPublicClient, http as viemHttp } from 'viem';

const walletConnectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const bscRpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL;
const bscTestnetRpcUrl = process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL;
const chainEnv = (process.env.NEXT_PUBLIC_CHAIN_ENV ?? 'testnet').toLowerCase();
const balanceRpcEnv = process.env.NEXT_PUBLIC_BALANCE_RPC_URL;

if (!walletConnectId) {
  throw new Error(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be set in your frontend/.env.local file.'
  );
}

const useTestnet = chainEnv !== 'mainnet';
const activeChain = useTestnet ? bscTestnet : bsc;
const activeRpcUrl = useTestnet ? bscTestnetRpcUrl : bscRpcUrl;
const balanceRpcUrl = balanceRpcEnv ?? activeRpcUrl;

if (!activeRpcUrl) {
  throw new Error(
    `Missing RPC url for ${useTestnet ? 'NEXT_PUBLIC_BSC_TESTNET_RPC_URL' : 'NEXT_PUBLIC_BSC_RPC_URL'}.`
  );
}

if (!balanceRpcUrl) {
  throw new Error(
    'Missing RPC url for balances. Set NEXT_PUBLIC_BALANCE_RPC_URL or reuse the active chain RPC.'
  );
}

export const targetChain = activeChain;
export const publicClient = createPublicClient({
  chain: activeChain,
  transport: viemHttp(balanceRpcUrl),
});

export const config = getDefaultConfig({
  appName: 'BNB Singleton Swap',
  projectId: walletConnectId,
  chains: [activeChain],
  transports: {
    [activeChain.id]: wagmiHttp(activeRpcUrl),
  },
  ssr: true,
});

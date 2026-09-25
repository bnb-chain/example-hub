import { useQuery } from '@tanstack/react-query';
import { Address, erc20Abi, formatUnits, zeroAddress } from 'viem';
import { publicClient } from '../config/wagmi';
import { TokenInfo } from './useTokenList';

interface TokenBalanceResult {
    balance: bigint;
    formatted: string;
    isLoading: boolean;
    refetch: () => void;
}

export function useTokenBalance(
    owner?: Address,
    token?: TokenInfo | null
): TokenBalanceResult {
    const decimals = token?.decimals ?? 18;

    const query = useQuery({
        queryKey: ['token-balance', owner, token?.address],
        enabled: Boolean(owner && token),
        queryFn: async () => {
            if (!owner || !token) return 0n;
            if (token.address === zeroAddress) {
                return publicClient.getBalance({ address: owner });
            }
            return (await publicClient.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [owner],
            })) as bigint;
        },
        refetchInterval: 15_000,
        staleTime: 10_000,
    });

    const balance = query.data ?? 0n;
    const formatted = formatUnits(balance, decimals);

    return {
        balance,
        formatted,
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
}

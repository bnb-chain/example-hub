import { useReadContract } from 'wagmi';
import { SINGLETON_ABI } from '../constants/abi';
import { SINGLETON_ADDRESS } from '../constants/tokens';
import { Address, zeroAddress } from 'viem';
import { useEffect, useState } from 'react';

export interface TokenInfo {
    address: Address;
    name: string;
    symbol: string;
    logo?: string;
    decimals: number;
}

export function useTokenList() {
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const nativeToken: TokenInfo = {
        address: zeroAddress,
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
        logo: 'https://placehold.co/40x40?text=B',
    };

    // 1. Get total count
    const { data: count } = useReadContract({
        address: SINGLETON_ADDRESS,
        abi: SINGLETON_ABI,
        functionName: 'getTokensLength',
    });

    // 2. Get paginated tokens (fetching all for now, assuming < 100 for hackathon)
    const { data: tokenData } = useReadContract({
        address: SINGLETON_ADDRESS,
        abi: SINGLETON_ABI,
        functionName: 'getTokensPaginated',
        args: [BigInt(0), count ? count as bigint : BigInt(100)],
        query: {
            enabled: !!count,
        }
    });

    useEffect(() => {
        if (tokenData) {
            let mappedTokens: TokenInfo[] = (tokenData as any[]).map((t) => ({
                address: t.token,
                name: t.name,
                symbol: t.symbol,
                decimals: 18, // Default, could fetch via multicall if needed
                logo: 'https://placehold.co/40x40?text=' + t.symbol[0], // Placeholder
            }));

            const hasNative = mappedTokens.some(
                (t) => t.address.toLowerCase() === nativeToken.address.toLowerCase()
            );
            if (!hasNative) {
                mappedTokens = [nativeToken, ...mappedTokens];
            } else {
                mappedTokens = mappedTokens.map((t) =>
                    t.address.toLowerCase() === nativeToken.address.toLowerCase()
                        ? nativeToken
                        : t
                );
            }

            setTokens(mappedTokens);
        }
    }, [tokenData]);

    return { tokens, count };
}

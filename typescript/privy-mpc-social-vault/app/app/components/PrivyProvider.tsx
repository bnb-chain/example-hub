'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, WagmiProvider } from '@privy-io/wagmi';
import { bsc, bscTestnet } from 'viem/chains';
import { http } from 'wagmi';

export const privyConfig = {
    loginMethods: ['email' as const, 'wallet' as const, 'google' as const, 'twitter' as const],
    appearance: {
        theme: 'dark' as const,
        accentColor: '#F0B90B' as `#${string}`, // BNB Yellow
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    },
    embeddedWallets: {
        ethereum: {
            createOnLogin: 'users-without-wallets' as const,
        },
    },
};

const wagmiConfig = createConfig({
    chains: [bsc, bscTestnet],
    transports: {
        [bsc.id]: http(),
        [bscTestnet.id]: http(),
    },
});

const queryClient = new QueryClient();

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'clp8y3k2b0001l4088g6y5f3s'}
            config={privyConfig}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}

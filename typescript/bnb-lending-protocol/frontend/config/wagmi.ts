'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'BNB Lending Protocol',
    projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
    chains: [bscTestnet],
    ssr: true,
});

// Replace these with your deployed contract addresses
export const CONTRACTS = {
    LENDING_POOL: '0x0000000000000000000000000000000000000000',
    USDC: '0x0000000000000000000000000000000000000000',
    BNB: '0x0000000000000000000000000000000000000000',
} as const;

export const ASSETS = [
    {
        symbol: 'mUSDC',
        name: 'Mock USDC',
        address: CONTRACTS.USDC,
        icon: '💵',
    },
    {
        symbol: 'mBNB',
        name: 'Mock BNB',
        address: CONTRACTS.BNB,
        icon: '💎',
    },
] as const;

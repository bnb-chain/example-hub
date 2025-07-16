// lib/bnbTestnet.ts
import { defineChain } from "viem";

export const bnbTestnet = defineChain({
    id: 97,
    name: "BNB Smart Chain Testnet",
    network: "bnb-testnet",
    nativeCurrency: {
        name: "Binance Coin",
        symbol: "BNB",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
        },
    },
    blockExplorers: {
        default: {
            name: "BscScan Testnet",
            url: "https://testnet.bscscan.com",
        },
    },
});

import { ethers } from 'ethers';
export interface AllowanceResult {
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
    spender: string;
    allowance: string;
    allowanceFormatted: string;
    balance: string;
    balanceFormatted: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskReason: string;
}
export interface ScanResult {
    ownerAddress: string;
    allowances: AllowanceResult[];
    totalAllowances: number;
    highRiskCount: number;
    criticalRiskCount: number;
}
/**
 * Get provider for BSC network
 */
export declare function getBSCProvider(): ethers.Provider;
/**
 * Check if an address is a contract
 */
export declare function isContract(address: string, provider: ethers.Provider): Promise<boolean>;
/**
 * Get token information
 */
export declare function getTokenInfo(tokenAddress: string, provider: ethers.Provider): Promise<{
    symbol: string;
    name: string;
    decimals: number;
}>;
/**
 * Calculate risk level for an allowance
 */
export declare function calculateRiskLevel(allowance: bigint, balance: bigint, totalSupply: bigint | null, isContractSpender: boolean): {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
};
/**
 * Scan for token allowances for a given owner address
 */
export declare function scanAllowances(ownerAddress: string, tokenAddresses?: string[], customSpenders?: string[]): Promise<ScanResult>;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
/**
 * Start Express server for web UI
 */
export declare function startServer(port?: number): void;
//# sourceMappingURL=app.d.ts.map
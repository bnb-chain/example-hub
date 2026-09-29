import { ethers } from 'ethers';
export interface FunctionAnalysis {
    name: string;
    type: 'function' | 'constructor' | 'fallback' | 'receive';
    visibility: 'public' | 'external' | 'internal' | 'private';
    stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
    inputs: Array<{
        name: string;
        type: string;
        indexed?: boolean;
    }>;
    outputs: Array<{
        name: string;
        type: string;
    }>;
    modifiers?: string[];
}
export interface EventAnalysis {
    name: string;
    inputs: Array<{
        name: string;
        type: string;
        indexed: boolean;
    }>;
}
export interface SurfaceAreaAnalysis {
    contractAddress: string;
    isProxy: boolean;
    implementationAddress?: string;
    totalFunctions: number;
    publicFunctions: number;
    externalFunctions: number;
    payableFunctions: number;
    functions: FunctionAnalysis[];
    totalEvents: number;
    events: EventAnalysis[];
    hasFallback: boolean;
    hasReceive: boolean;
    complexityScore: number;
    riskFactors: string[];
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
 * Check if contract is a proxy (EIP-1967 standard)
 */
export declare function checkProxy(contractAddress: string, provider: ethers.Provider): Promise<{
    isProxy: boolean;
    implementationAddress?: string;
}>;
/**
 * Get contract ABI from bytecode (simplified - in production, use verified contracts)
 * For this demo, we'll use the interface to get ABI if available
 */
export declare function getContractABI(contractAddress: string, provider: ethers.Provider): Promise<ethers.Interface | null>;
/**
 * Analyze contract ABI to extract surface area information
 */
export declare function analyzeABI(abi: ethers.InterfaceAbi): {
    functions: FunctionAnalysis[];
    events: EventAnalysis[];
    hasFallback: boolean;
    hasReceive: boolean;
};
/**
 * Calculate complexity score based on surface area
 */
export declare function calculateComplexityScore(analysis: {
    totalFunctions: number;
    publicFunctions: number;
    externalFunctions: number;
    payableFunctions: number;
    totalEvents: number;
    hasFallback: boolean;
    hasReceive: boolean;
}): number;
/**
 * Identify risk factors based on analysis
 */
export declare function identifyRiskFactors(analysis: {
    publicFunctions: number;
    externalFunctions: number;
    payableFunctions: number;
    hasFallback: boolean;
    hasReceive: boolean;
    isProxy: boolean;
}): string[];
/**
 * Analyze contract surface area
 */
export declare function analyzeContractSurfaceArea(contractAddress: string, abi?: ethers.InterfaceAbi): Promise<SurfaceAreaAnalysis>;
/**
 * Get common contract ABIs for well-known contracts on BSC
 */
export declare function getCommonContractABI(contractType: 'ERC20' | 'ERC721' | 'ERC1155' | 'UNISWAP_V2' | 'UNISWAP_V3'): ethers.InterfaceAbi;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
/**
 * Start Express server for web UI
 */
export declare function startServer(port?: number): void;
//# sourceMappingURL=app.d.ts.map
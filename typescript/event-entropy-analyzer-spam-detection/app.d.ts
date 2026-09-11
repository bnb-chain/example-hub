import { ethers } from 'ethers';
export interface EventData {
    blockNumber: number;
    transactionHash: string;
    from: string;
    to: string;
    value: string;
    eventName: string;
}
export interface EntropyAnalysis {
    entropy: number;
    uniqueAddresses: number;
    totalEvents: number;
    spamScore: number;
    spamLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    patterns: {
        repeatedFrom: number;
        repeatedTo: number;
        repeatedValue: number;
        sequentialBlocks: number;
    };
    recommendations: string[];
}
export interface AnalysisResult {
    contractAddress: string;
    eventType: string;
    blockRange: {
        from: number;
        to: number;
    };
    events: EventData[];
    analysis: EntropyAnalysis;
}
/**
 * Get provider for BSC network
 */
export declare function getBSCProvider(): ethers.Provider;
/**
 * Calculate Shannon entropy for a set of values
 * Higher entropy = more diversity = less spam
 * Lower entropy = less diversity = more spam
 */
export declare function calculateEntropy(values: string[]): number;
/**
 * Fetch events from a contract within a block range
 */
export declare function fetchEvents(contractAddress: string, eventSignature: string, fromBlock: number, toBlock: number, provider?: ethers.Provider): Promise<EventData[]>;
/**
 * Analyze patterns in events to detect spam indicators
 */
export declare function analyzePatterns(events: EventData[]): {
    repeatedFrom: number;
    repeatedTo: number;
    repeatedValue: number;
    sequentialBlocks: number;
};
/**
 * Calculate spam score based on entropy and patterns
 * Returns a score from 0-100, where higher = more spam
 */
export declare function calculateSpamScore(entropy: number, totalEvents: number, uniqueAddresses: number, patterns: {
    repeatedFrom: number;
    repeatedTo: number;
    repeatedValue: number;
    sequentialBlocks: number;
}): number;
/**
 * Determine spam level based on spam score
 */
export declare function getSpamLevel(spamScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Generate recommendations based on analysis
 */
export declare function generateRecommendations(analysis: EntropyAnalysis): string[];
/**
 * Perform complete entropy analysis on events
 */
export declare function analyzeEventEntropy(events: EventData[]): EntropyAnalysis;
/**
 * Main analysis function
 */
export declare function analyzeContractEvents(contractAddress: string, eventType: "Transfer" | "Approval" | undefined, fromBlock: number, toBlock: number, provider?: ethers.Provider): Promise<AnalysisResult>;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
/**
 * Start Express server for web UI
 */
export declare function startServer(port?: number): void;
//# sourceMappingURL=app.d.ts.map
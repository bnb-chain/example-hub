interface BlockProducerStats {
    address: string;
    blockCount: number;
    percentage: number;
    expectedBlocks: number;
    deviation: number;
}
interface FairnessMetrics {
    totalBlocks: number;
    uniqueProducers: number;
    producers: BlockProducerStats[];
    giniCoefficient: number;
    maxDeviation: number;
    isFair: boolean;
}
declare class BlockProducerFairnessMonitor {
    private provider;
    private app;
    private port;
    constructor();
    private setupRoutes;
    /**
     * Fetches recent blocks and extracts producer addresses
     */
    fetchRecentBlocks(count: number): Promise<Array<{
        number: number;
        producer: string;
    }>>;
    /**
     * Calculates Gini coefficient to measure distribution inequality
     */
    calculateGiniCoefficient(blockCounts: number[]): number;
    /**
     * Analyzes block producer fairness
     */
    analyzeBlockProducers(blockCount?: number): Promise<FairnessMetrics>;
    /**
     * Formats address for display
     */
    formatAddress(address: string): string;
    /**
     * Starts the server
     */
    start(): void;
}
export { BlockProducerFairnessMonitor, BlockProducerStats, FairnessMetrics };
//# sourceMappingURL=app.d.ts.map
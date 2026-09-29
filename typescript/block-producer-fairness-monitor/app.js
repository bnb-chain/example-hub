"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockProducerFairnessMonitor = void 0;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
dotenv.config();
class BlockProducerFairnessMonitor {
    constructor() {
        const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '3000', 10);
        this.setupRoutes();
    }
    setupRoutes() {
        // Serve static files from root directory
        this.app.use(express_1.default.static(__dirname));
        this.app.use(express_1.default.json());
        this.app.get('/', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, 'index.html'));
        });
        this.app.get('/api/analyze', async (req, res) => {
            try {
                const blockCount = parseInt(req.query.blockCount || '100', 10);
                const metrics = await this.analyzeBlockProducers(blockCount);
                res.json(metrics);
            }
            catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }
    /**
     * Fetches recent blocks and extracts producer addresses
     */
    async fetchRecentBlocks(count) {
        const latestBlock = await this.provider.getBlockNumber();
        const blocks = [];
        for (let i = 0; i < count; i++) {
            const blockNumber = latestBlock - i;
            try {
                const block = await this.provider.getBlock(blockNumber, false);
                if (block) {
                    blocks.push({
                        number: blockNumber,
                        producer: block.miner || '0x0000000000000000000000000000000000000000'
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to fetch block ${blockNumber}:`, error);
            }
        }
        return blocks;
    }
    /**
     * Calculates Gini coefficient to measure distribution inequality
     */
    calculateGiniCoefficient(blockCounts) {
        if (blockCounts.length === 0)
            return 0;
        if (blockCounts.length === 1)
            return 0;
        const sorted = [...blockCounts].sort((a, b) => a - b);
        const n = sorted.length;
        const mean = sorted.reduce((a, b) => a + b, 0) / n;
        if (mean === 0)
            return 0;
        let numerator = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                numerator += Math.abs(sorted[i] - sorted[j]);
            }
        }
        const denominator = 2 * n * n * mean;
        return numerator / denominator;
    }
    /**
     * Analyzes block producer fairness
     */
    async analyzeBlockProducers(blockCount = 100) {
        const blocks = await this.fetchRecentBlocks(blockCount);
        const producerMap = new Map();
        // Count blocks per producer
        blocks.forEach(block => {
            const count = producerMap.get(block.producer) || 0;
            producerMap.set(block.producer, count + 1);
        });
        const totalBlocks = blocks.length;
        const uniqueProducers = producerMap.size;
        const expectedBlocksPerProducer = totalBlocks / uniqueProducers;
        // Calculate statistics for each producer
        const producers = Array.from(producerMap.entries())
            .map(([address, blockCount]) => {
            const percentage = (blockCount / totalBlocks) * 100;
            const deviation = blockCount - expectedBlocksPerProducer;
            return {
                address,
                blockCount,
                percentage,
                expectedBlocks: expectedBlocksPerProducer,
                deviation
            };
        })
            .sort((a, b) => b.blockCount - a.blockCount);
        // Calculate Gini coefficient
        const blockCounts = Array.from(producerMap.values());
        const giniCoefficient = this.calculateGiniCoefficient(blockCounts);
        // Calculate max deviation
        const maxDeviation = Math.max(...producers.map(p => Math.abs(p.deviation)));
        // Determine if distribution is fair based on BSC architecture (20-40 validators)
        // Very lenient thresholds - only extreme inequality is considered unfair
        // Gini threshold: 0.9 (90%) - only distributions with Gini > 0.9 are considered unfair
        // Lower Gini = more equal distribution = fairer
        // This means most normal distributions will be considered fair
        const giniThreshold = 0.9;
        const deviationThreshold = 0.5;
        // Consider unfair only if Gini is greater than 0.9 (very high inequality)
        // OR if deviation is extremely high (more than 50% difference from expected)
        const isFair = !(giniCoefficient > giniThreshold || maxDeviation > expectedBlocksPerProducer * deviationThreshold);
        return {
            totalBlocks,
            uniqueProducers,
            producers,
            giniCoefficient,
            maxDeviation,
            isFair
        };
    }
    /**
     * Formats address for display
     */
    formatAddress(address) {
        if (!address || address === '0x0000000000000000000000000000000000000000') {
            return 'Unknown';
        }
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    /**
     * Starts the server
     */
    start() {
        this.app.listen(this.port, () => {
            console.log(`Block Producer Fairness Monitor running on http://localhost:${this.port}`);
            console.log(`Analyzing blocks from BSC network...`);
        });
    }
}
exports.BlockProducerFairnessMonitor = BlockProducerFairnessMonitor;
// Start server if running directly
if (require.main === module) {
    const monitor = new BlockProducerFairnessMonitor();
    monitor.start();
}
//# sourceMappingURL=app.js.map
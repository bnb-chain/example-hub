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
const express_1 = __importDefault(require("express"));
const app_1 = require("./app");
const path = __importStar(require("path"));
// Get current directory (works in both CommonJS and ES modules)
const currentDir = __dirname || process.cwd();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static(currentDir));
// API endpoint for event analysis
app.post('/api/analyze', async (req, res) => {
    try {
        const { contractAddress, eventType, fromBlock, toBlock } = req.body;
        if (!contractAddress) {
            return res.status(400).json({ error: 'Contract address is required' });
        }
        if (!fromBlock && fromBlock !== 0) {
            return res.status(400).json({ error: 'From block is required' });
        }
        const provider = (0, app_1.getBSCProvider)();
        let actualToBlock = toBlock;
        // If toBlock is not provided or is 'latest', get the latest block
        if (!toBlock || toBlock === 'latest') {
            const latestBlock = await provider.getBlockNumber();
            actualToBlock = latestBlock;
        }
        const result = await (0, app_1.analyzeContractEvents)(contractAddress, eventType || 'Transfer', parseInt(fromBlock), parseInt(actualToBlock), provider);
        res.json(result);
    }
    catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});
// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(currentDir, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`🚀 Event Entropy Analyzer server running on http://localhost:${PORT}`);
    console.log(`📊 Open your browser to view the UI`);
});
//# sourceMappingURL=server.js.map
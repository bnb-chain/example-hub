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
exports.getBSCProvider = getBSCProvider;
exports.isContract = isContract;
exports.checkProxy = checkProxy;
exports.getContractABI = getContractABI;
exports.analyzeABI = analyzeABI;
exports.calculateComplexityScore = calculateComplexityScore;
exports.identifyRiskFactors = identifyRiskFactors;
exports.analyzeContractSurfaceArea = analyzeContractSurfaceArea;
exports.getCommonContractABI = getCommonContractABI;
exports.main = main;
exports.startServer = startServer;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
dotenv.config();
/**
 * Get provider for BSC network
 */
function getBSCProvider() {
    const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
    return new ethers_1.ethers.JsonRpcProvider(rpcUrl);
}
/**
 * Check if an address is a contract
 */
async function isContract(address, provider) {
    try {
        const code = await provider.getCode(address);
        return code !== '0x' && code !== '';
    }
    catch (error) {
        return false;
    }
}
/**
 * Check if contract is a proxy (EIP-1967 standard)
 */
async function checkProxy(contractAddress, provider) {
    try {
        // EIP-1967 implementation slot
        const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
        const storage = await provider.getStorage(contractAddress, IMPLEMENTATION_SLOT);
        if (storage && storage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const implementation = '0x' + storage.slice(-40);
            return {
                isProxy: true,
                implementationAddress: ethers_1.ethers.getAddress(implementation)
            };
        }
        return { isProxy: false };
    }
    catch (error) {
        return { isProxy: false };
    }
}
/**
 * Get contract ABI from bytecode (simplified - in production, use verified contracts)
 * For this demo, we'll use the interface to get ABI if available
 */
async function getContractABI(contractAddress, provider) {
    try {
        // Try to get ABI from etherscan-like services or use minimal interface
        // For this example, we'll create a minimal interface that can decode common calls
        // In production, you'd fetch from a verified contract source
        // We'll use a generic approach - try to get the contract and infer from common patterns
        const code = await provider.getCode(contractAddress);
        if (!code || code === '0x') {
            return null;
        }
        // For demo purposes, we'll return null and let the caller handle it
        // In a real implementation, you'd fetch from BSCScan API or similar
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Analyze contract ABI to extract surface area information
 */
function analyzeABI(abi) {
    const functions = [];
    const events = [];
    let hasFallback = false;
    let hasReceive = false;
    try {
        const iface = new ethers_1.ethers.Interface(abi);
        // Analyze functions
        for (const fragment of iface.fragments) {
            if (fragment.type === 'function') {
                const func = fragment;
                // In ethers v6, visibility is not directly available on FunctionFragment
                // We infer it: if function has a name and is not a constructor, it's public or external
                // For simplicity, we'll default to 'public' (most common case)
                // External functions are typically those that can't be called internally
                const visibility = 'public';
                functions.push({
                    name: func.name,
                    type: 'function',
                    visibility: visibility,
                    stateMutability: func.stateMutability,
                    inputs: func.inputs.map(input => ({
                        name: input.name || '',
                        type: input.type
                    })),
                    outputs: func.outputs.map(output => ({
                        name: output.name || '',
                        type: output.type
                    }))
                });
            }
            else if (fragment.type === 'event') {
                const event = fragment;
                events.push({
                    name: event.name,
                    inputs: event.inputs.map(input => ({
                        name: input.name || '',
                        type: input.type,
                        indexed: input.indexed || false
                    }))
                });
            }
            else if (fragment.type === 'fallback') {
                hasFallback = true;
            }
        }
        // Check for receive function explicitly in the raw ABI (ethers v6 doesn't expose it as a fragment)
        if (Array.isArray(abi)) {
            // Check if any item is a receive function (can be string or object)
            const receiveFunction = abi.find((item) => {
                if (typeof item === 'string') {
                    return item.trim().startsWith('receive()');
                }
                else if (item && typeof item === 'object') {
                    return item.type === 'receive';
                }
                return false;
            });
            if (receiveFunction) {
                hasReceive = true;
            }
        }
    }
    catch (error) {
        // If ABI parsing fails, return empty results
    }
    return { functions, events, hasFallback, hasReceive };
}
/**
 * Calculate complexity score based on surface area
 */
function calculateComplexityScore(analysis) {
    let score = 0;
    // Base complexity from total functions
    score += analysis.totalFunctions * 2;
    // Public/external functions are more exposed
    score += analysis.publicFunctions * 3;
    score += analysis.externalFunctions * 3;
    // Payable functions increase attack surface
    score += analysis.payableFunctions * 5;
    // Events indicate contract activity
    score += analysis.totalEvents * 1;
    // Fallback and receive functions are high risk
    if (analysis.hasFallback)
        score += 10;
    if (analysis.hasReceive)
        score += 10;
    return score;
}
/**
 * Identify risk factors based on analysis
 */
function identifyRiskFactors(analysis) {
    const risks = [];
    if (analysis.publicFunctions > 20) {
        risks.push('High number of public functions increases attack surface');
    }
    if (analysis.externalFunctions > 15) {
        risks.push('Many external functions may indicate complex interaction patterns');
    }
    if (analysis.payableFunctions > 5) {
        risks.push('Multiple payable functions increase financial risk exposure');
    }
    if (analysis.hasFallback) {
        risks.push('Fallback function can receive unexpected calls');
    }
    if (analysis.hasReceive) {
        risks.push('Receive function automatically accepts ETH transfers');
    }
    if (analysis.isProxy) {
        risks.push('Proxy pattern adds upgradeability risk');
    }
    if (risks.length === 0) {
        risks.push('No significant risk factors identified');
    }
    return risks;
}
/**
 * Analyze contract surface area
 */
async function analyzeContractSurfaceArea(contractAddress, abi) {
    const provider = getBSCProvider();
    // Normalize address
    const normalizedAddress = ethers_1.ethers.getAddress(contractAddress);
    // Check if it's a contract
    const isContractAddress = await isContract(normalizedAddress, provider);
    if (!isContractAddress) {
        throw new Error('Address is not a contract');
    }
    // Check for proxy
    const proxyInfo = await checkProxy(normalizedAddress, provider);
    // Analyze ABI
    let functions = [];
    let events = [];
    let hasFallback = false;
    let hasReceive = false;
    if (abi) {
        const abiAnalysis = analyzeABI(abi);
        functions = abiAnalysis.functions;
        events = abiAnalysis.events;
        hasFallback = abiAnalysis.hasFallback;
        hasReceive = abiAnalysis.hasReceive;
    }
    const publicFunctions = functions.filter(f => f.visibility === 'public').length;
    const externalFunctions = functions.filter(f => f.visibility === 'external').length;
    const payableFunctions = functions.filter(f => f.stateMutability === 'payable').length;
    const complexityScore = calculateComplexityScore({
        totalFunctions: functions.length,
        publicFunctions,
        externalFunctions,
        payableFunctions,
        totalEvents: events.length,
        hasFallback,
        hasReceive
    });
    const riskFactors = identifyRiskFactors({
        publicFunctions,
        externalFunctions,
        payableFunctions,
        hasFallback,
        hasReceive,
        isProxy: proxyInfo.isProxy
    });
    return {
        contractAddress: normalizedAddress,
        isProxy: proxyInfo.isProxy,
        implementationAddress: proxyInfo.implementationAddress,
        totalFunctions: functions.length,
        publicFunctions,
        externalFunctions,
        payableFunctions,
        functions,
        totalEvents: events.length,
        events,
        hasFallback,
        hasReceive,
        complexityScore,
        riskFactors
    };
}
/**
 * Get common contract ABIs for well-known contracts on BSC
 */
function getCommonContractABI(contractType) {
    const abis = {
        ERC20: [
            'function totalSupply() external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)',
            'function transfer(address to, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
            'event Transfer(address indexed from, address indexed to, uint256 value)',
            'event Approval(address indexed owner, address indexed spender, uint256 value)'
        ],
        ERC721: [
            'function balanceOf(address owner) external view returns (uint256)',
            'function ownerOf(uint256 tokenId) external view returns (address)',
            'function safeTransferFrom(address from, address to, uint256 tokenId) external',
            'function transferFrom(address from, address to, uint256 tokenId) external',
            'function approve(address to, uint256 tokenId) external',
            'function setApprovalForAll(address operator, bool approved) external',
            'function getApproved(uint256 tokenId) external view returns (address)',
            'function isApprovedForAll(address owner, address operator) external view returns (bool)',
            'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
            'event Approval(address indexed owner, address indexed approved, address indexed tokenId)',
            'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
        ],
        UNISWAP_V2: [
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
            'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
            'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
            'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
            'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
            'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)'
        ]
    };
    return abis[contractType] || [];
}
/**
 * Main function for CLI usage
 */
async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
    const contractType = (process.env.CONTRACT_TYPE || process.argv[3]);
    if (!contractAddress) {
        console.error('Usage: npm start [contract-address] [contract-type]');
        console.error('Or set CONTRACT_ADDRESS and optionally CONTRACT_TYPE in .env file');
        console.error('Or run without arguments to start the web server');
        console.error('Contract types: ERC20, ERC721, ERC1155, UNISWAP_V2, UNISWAP_V3');
        process.exit(1);
    }
    let abi;
    if (contractType) {
        abi = getCommonContractABI(contractType);
    }
    console.log(`Analyzing contract surface area for: ${contractAddress}`);
    if (contractType) {
        console.log(`Using ${contractType} ABI template`);
    }
    try {
        const result = await analyzeContractSurfaceArea(contractAddress, abi);
        console.log(`\n=== Contract Surface Area Analysis ===`);
        console.log(`Contract: ${result.contractAddress}`);
        console.log(`Is Proxy: ${result.isProxy}`);
        if (result.implementationAddress) {
            console.log(`Implementation: ${result.implementationAddress}`);
        }
        console.log(`\nFunctions: ${result.totalFunctions} total`);
        console.log(`  - Public: ${result.publicFunctions}`);
        console.log(`  - External: ${result.externalFunctions}`);
        console.log(`  - Payable: ${result.payableFunctions}`);
        console.log(`Events: ${result.totalEvents}`);
        console.log(`Has Fallback: ${result.hasFallback}`);
        console.log(`Has Receive: ${result.hasReceive}`);
        console.log(`Complexity Score: ${result.complexityScore}`);
        console.log(`\nRisk Factors:`);
        result.riskFactors.forEach(risk => console.log(`  - ${risk}`));
        if (result.functions.length > 0) {
            console.log(`\nFunctions:`);
            result.functions.forEach(func => {
                console.log(`  ${func.visibility} ${func.stateMutability} ${func.name}(${func.inputs.map(i => `${i.type} ${i.name}`).join(', ')})`);
            });
        }
        if (result.events.length > 0) {
            console.log(`\nEvents:`);
            result.events.forEach(event => {
                console.log(`  event ${event.name}(${event.inputs.map(i => `${i.indexed ? 'indexed ' : ''}${i.type} ${i.name}`).join(', ')})`);
            });
        }
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}
/**
 * Start Express server for web UI
 */
function startServer(port = 3000) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Serve static files from root directory
    app.use(express_1.default.static(__dirname));
    app.get('/', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, 'frontend.html'));
    });
    app.post('/api/analyze', async (req, res) => {
        try {
            const { contractAddress, contractType } = req.body;
            if (!contractAddress) {
                return res.status(400).json({ error: 'Contract address is required' });
            }
            let abi;
            if (contractType) {
                abi = getCommonContractABI(contractType);
            }
            const result = await analyzeContractSurfaceArea(contractAddress, abi);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message || 'Failed to analyze contract' });
        }
    });
    app.listen(port, () => {
        console.log(`Contract Surface Area Analyzer server running on http://localhost:${port}`);
        console.log('Open your browser to view the UI');
    });
}
// Run if executed directly
if (require.main === module) {
    const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
    // If no arguments and no env var, start server by default
    if (!contractAddress || process.argv[2] === 'server') {
        const port = parseInt(process.env.PORT || process.argv[3] || '3000');
        startServer(port);
    }
    else {
        main().catch(console.error);
    }
}
//# sourceMappingURL=app.js.map
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
exports.getTokenInfo = getTokenInfo;
exports.calculateRiskLevel = calculateRiskLevel;
exports.scanAllowances = scanAllowances;
exports.main = main;
exports.startServer = startServer;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
dotenv.config();
// ERC-20 Token ABI (minimal - just allowance function)
const ERC20_ABI = [
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function name() external view returns (string)',
    'function totalSupply() external view returns (uint256)'
];
// Common token addresses on BSC
const COMMON_BSC_TOKENS = [
    '0x55d398326f99059fF775485246999027B3197955', // USDT
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
    '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
    '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', // DAI
];
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
 * Get token information
 */
async function getTokenInfo(tokenAddress, provider) {
    try {
        const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => 'UNKNOWN'),
            tokenContract.name().catch(() => 'Unknown Token'),
            tokenContract.decimals().catch(() => 18)
        ]);
        return { symbol, name, decimals };
    }
    catch (error) {
        return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 };
    }
}
/**
 * Calculate risk level for an allowance
 */
function calculateRiskLevel(allowance, balance, totalSupply, isContractSpender) {
    // CRITICAL: Allowance is max uint256 (infinite allowance)
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (allowance === MAX_UINT256 || allowance >= MAX_UINT256 / BigInt(2)) {
        return {
            level: 'CRITICAL',
            reason: 'Infinite or near-infinite allowance detected. Spender can drain all tokens.'
        };
    }
    // HIGH: Allowance exceeds balance by significant margin
    if (balance > 0n) {
        // Use BigInt comparison to avoid precision loss
        if (allowance >= balance * BigInt(100)) {
            const allowanceToBalanceRatio = Number(allowance) / Number(balance);
            return {
                level: 'HIGH',
                reason: `Allowance (${allowanceToBalanceRatio.toFixed(2)}x) is much larger than current balance.`
            };
        }
    }
    // HIGH: Very large absolute allowance (> 1M tokens for 18 decimals)
    const oneMillion = BigInt('1000000000000000000000000'); // 1M * 10^18
    if (allowance > oneMillion) {
        return {
            level: 'HIGH',
            reason: 'Very large absolute allowance detected (> 1M tokens).'
        };
    }
    // MEDIUM: Allowance exceeds balance
    if (balance > 0n && allowance > balance) {
        return {
            level: 'MEDIUM',
            reason: 'Allowance exceeds current token balance.'
        };
    }
    // MEDIUM: Contract spender with significant allowance
    if (isContractSpender && allowance > BigInt('1000000000000000000000')) { // > 1000 tokens
        return {
            level: 'MEDIUM',
            reason: 'Significant allowance granted to a contract address.'
        };
    }
    return {
        level: 'LOW',
        reason: 'Allowance appears to be within reasonable limits.'
    };
}
/**
 * Scan for token allowances for a given owner address
 */
async function scanAllowances(ownerAddress, tokenAddresses = COMMON_BSC_TOKENS, customSpenders = []) {
    const provider = getBSCProvider();
    const allowances = [];
    // Normalize address
    const normalizedOwner = ethers_1.ethers.getAddress(ownerAddress);
    // Get all unique spender addresses to check
    const spendersToCheck = new Set(customSpenders.map(s => ethers_1.ethers.getAddress(s)));
    // Scan common tokens
    for (const tokenAddress of tokenAddresses) {
        try {
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const tokenInfo = await getTokenInfo(tokenAddress, provider);
            // Get balance
            const balance = await tokenContract.balanceOf(normalizedOwner).catch(() => BigInt(0));
            const balanceFormatted = ethers_1.ethers.formatUnits(balance, tokenInfo.decimals);
            // If custom spenders provided, check those
            if (customSpenders.length > 0) {
                for (const spender of customSpenders) {
                    try {
                        const normalizedSpender = ethers_1.ethers.getAddress(spender);
                        const allowance = await tokenContract.allowance(normalizedOwner, normalizedSpender);
                        if (allowance > 0n) {
                            const isContractSpender = await isContract(normalizedSpender, provider);
                            const totalSupply = await tokenContract.totalSupply().catch(() => null);
                            const { level, reason } = calculateRiskLevel(allowance, balance, totalSupply, isContractSpender);
                            allowances.push({
                                tokenAddress,
                                tokenSymbol: tokenInfo.symbol,
                                tokenName: tokenInfo.name,
                                spender: normalizedSpender,
                                allowance: allowance.toString(),
                                allowanceFormatted: ethers_1.ethers.formatUnits(allowance, tokenInfo.decimals),
                                balance: balance.toString(),
                                balanceFormatted,
                                riskLevel: level,
                                riskReason: reason
                            });
                        }
                    }
                    catch (error) {
                        // Skip failed spender checks
                        continue;
                    }
                }
            }
            else {
                // For now, we'll need to check known DEX routers and common spenders
                // In a full implementation, you'd query events to find all spenders
                const commonSpenders = [
                    '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router V2
                    '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', // PancakeSwap Router V3
                    '0x11111112542D85B3EF69AE05771c2dCCff4fAa26', // 1inch Router
                ];
                for (const spender of commonSpenders) {
                    try {
                        const normalizedSpender = ethers_1.ethers.getAddress(spender);
                        const allowance = await tokenContract.allowance(normalizedOwner, normalizedSpender);
                        if (allowance > 0n) {
                            const isContractSpender = await isContract(normalizedSpender, provider);
                            const totalSupply = await tokenContract.totalSupply().catch(() => null);
                            const { level, reason } = calculateRiskLevel(allowance, balance, totalSupply, isContractSpender);
                            allowances.push({
                                tokenAddress,
                                tokenSymbol: tokenInfo.symbol,
                                tokenName: tokenInfo.name,
                                spender: normalizedSpender,
                                allowance: allowance.toString(),
                                allowanceFormatted: ethers_1.ethers.formatUnits(allowance, tokenInfo.decimals),
                                balance: balance.toString(),
                                balanceFormatted,
                                riskLevel: level,
                                riskReason: reason
                            });
                        }
                    }
                    catch (error) {
                        continue;
                    }
                }
            }
        }
        catch (error) {
            // Skip tokens that fail
            continue;
        }
    }
    const highRiskCount = allowances.filter(a => a.riskLevel === 'HIGH').length;
    const criticalRiskCount = allowances.filter(a => a.riskLevel === 'CRITICAL').length;
    return {
        ownerAddress: normalizedOwner,
        allowances,
        totalAllowances: allowances.length,
        highRiskCount,
        criticalRiskCount
    };
}
/**
 * Main function for CLI usage
 */
async function main() {
    // Get owner address from args (set by caller if from env)
    const ownerAddress = process.argv[2];
    if (!ownerAddress) {
        console.error('Usage: npm start [owner-address] [spender-address-1] [spender-address-2] ...');
        console.error('Or set OWNER_ADDRESS in .env file');
        console.error('Or run without arguments to start the web server');
        console.error('Example: npm start 0x1234567890123456789012345678901234567890');
        process.exit(1);
    }
    const customSpenders = process.argv.slice(3);
    console.log(`Scanning allowances for: ${ownerAddress}`);
    if (customSpenders.length > 0) {
        console.log(`Checking custom spenders: ${customSpenders.join(', ')}`);
    }
    const result = await scanAllowances(ownerAddress, COMMON_BSC_TOKENS, customSpenders);
    console.log(`\nFound ${result.totalAllowances} active allowances`);
    console.log(`High Risk: ${result.highRiskCount}, Critical: ${result.criticalRiskCount}\n`);
    result.allowances.forEach(allowance => {
        console.log(`Token: ${allowance.tokenSymbol} (${allowance.tokenName})`);
        console.log(`  Spender: ${allowance.spender}`);
        console.log(`  Allowance: ${allowance.allowanceFormatted}`);
        console.log(`  Balance: ${allowance.balanceFormatted}`);
        console.log(`  Risk: ${allowance.riskLevel} - ${allowance.riskReason}`);
        console.log('');
    });
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
        res.sendFile(path_1.default.join(__dirname, 'index.html'));
    });
    app.listen(port, () => {
        console.log(`Allowance Abuse Scanner server running on http://localhost:${port}`);
        console.log('Open your browser to view the UI');
    });
}
// Run if executed directly
if (require.main === module) {
    // If 'server' is explicitly requested or no CLI arguments provided, start server
    // (Ignore OWNER_ADDRESS env var when no args - server mode takes precedence)
    if (process.argv[2] === 'server' || process.argv.length === 2) {
        const port = parseInt(process.env.PORT || process.argv[3] || '3000');
        startServer(port);
    }
    else {
        // CLI mode - use CLI argument first, then env var as fallback
        const ownerAddress = process.argv[2] || process.env.OWNER_ADDRESS;
        if (!ownerAddress) {
            console.error('Usage: npm start [owner-address] [spender-address-1] [spender-address-2] ...');
            console.error('Or set OWNER_ADDRESS in .env file');
            console.error('Or run without arguments to start the web server');
            process.exit(1);
        }
        // If ownerAddress came from env, set it in argv for main function
        if (!process.argv[2] && ownerAddress) {
            process.argv[2] = ownerAddress;
        }
        main().catch(console.error);
    }
}
//# sourceMappingURL=app.js.map
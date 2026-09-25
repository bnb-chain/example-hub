#!/usr/bin/env node

/**
 * Order Execution Bot for BNBSwap
 * 
 * This bot monitors limit orders and executes them when profitable.
 * Executors earn a 0.1% fee on successful executions.
 * 
 * Usage:
 *   node bot.js
 * proyect
 * Environment Variables:
 *   PRIVATE_KEY - Your wallet private key
 *   RPC_URL - BNB Chain RPC endpoint
 *   SINGLETON_SWAP_ADDRESS - Address of the SingletonSwap contract
 *   POLL_INTERVAL - Polling interval in seconds (default: 10)
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const CONFIG = {
    privateKey: process.env.PRIVATE_KEY,
    rpcUrl: process.env.RPC_URL || 'https://bsc-dataseed.binance.org/',
    singletonSwapAddress: process.env.SINGLETON_SWAP_ADDRESS,
    pollInterval: parseInt(process.env.POLL_INTERVAL || '10') * 1000,
    minProfitWei: ethers.parseUnits('0.001', 18), // Minimum 0.001 tokens profit
};

// SingletonSwap ABI (minimal for bot)
const SINGLETON_SWAP_ABI = [
    'function nextOrderId() view returns (uint256)',
    'function orders(uint256) view returns (uint256 id, address owner, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bool executed)',
    'function executeOrder(uint256 orderId)',
    'function getReserves(address tokenA, address tokenB) view returns (uint256 reserveA, uint256 reserveB)',
    'event OrderPlaced(uint256 indexed orderId, address indexed owner, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)',
    'event OrderExecuted(uint256 indexed orderId, address indexed executor, uint256 amountOut)',
    'event OrderCanceled(uint256 indexed orderId)'
];

class OrderExecutionBot {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
        this.wallet = new ethers.Wallet(CONFIG.privateKey, this.provider);
        this.contract = new ethers.Contract(
            CONFIG.singletonSwapAddress,
            SINGLETON_SWAP_ABI,
            this.wallet
        );
        this.finalizedOrders = new Set(); // Cache for executed or canceled orders
        this.isRunning = false;
    }

    async start() {
        console.log('🤖 Order Execution Bot Starting...');
        console.log(`📍 Contract: ${CONFIG.singletonSwapAddress}`);
        console.log(`👛 Executor: ${this.wallet.address}`);
        console.log(`⏱️  Poll Interval: ${CONFIG.pollInterval / 1000}s\n`);

        this.isRunning = true;

        // Listen for new orders
        this.contract.on('OrderPlaced', (orderId, owner, tokenIn, tokenOut, amountIn, minAmountOut) => {
            console.log(`\n📝 New Order Detected: #${orderId}`);
            console.log(`   Owner: ${owner}`);
            console.log(`   ${amountIn} ${tokenIn} → ${minAmountOut} ${tokenOut}`);
            this.checkAndExecuteOrder(orderId);
        });

        // Listen for executed orders
        this.contract.on('OrderExecuted', (orderId) => {
            if (!this.finalizedOrders.has(orderId.toString())) {
                console.log(`\n✅ Order #${orderId} executed on-chain`);
                this.finalizedOrders.add(orderId.toString());
            }
        });

        // Listen for canceled orders
        this.contract.on('OrderCanceled', (orderId) => {
            if (!this.finalizedOrders.has(orderId.toString())) {
                console.log(`\n🚫 Order #${orderId} canceled on-chain`);
                this.finalizedOrders.add(orderId.toString());
            }
        });

        // Poll existing orders
        while (this.isRunning) {
            await this.pollOrders();
            await this.sleep(CONFIG.pollInterval);
        }
    }

    async pollOrders() {
        try {
            const nextOrderId = await this.contract.nextOrderId();

            // Process orders in batches to avoid overwhelming RPC
            const batchSize = 20;
            for (let i = 1n; i < nextOrderId; i += BigInt(batchSize)) {
                const promises = [];
                for (let j = 0n; j < BigInt(batchSize) && (i + j) < nextOrderId; j++) {
                    promises.push(this.checkAndExecuteOrder(i + j));
                }
                await Promise.all(promises);
            }
        } catch (error) {
            console.error('❌ Error polling orders:', error.message);
        }
    }

    async checkAndExecuteOrder(orderId) {
        const idStr = orderId.toString();

        // Skip locally known finalized orders
        if (this.finalizedOrders.has(idStr)) return;

        try {
            const order = await this.contract.orders(orderId);

            // Update cache if executed
            if (order.executed) {
                this.finalizedOrders.add(idStr);
                return;
            }

            // Check if price can be met
            const canExecute = await this.canExecuteOrder(order);

            if (canExecute) {
                console.log(`\n🎯 Executing Order #${orderId}...`);
                await this.executeOrder(orderId);
            }
        } catch (error) {
            // Silently skip errors for known reasons
            if (!error.message.includes('ALREADY_EXECUTED') && !error.message.includes('PRICE_NOT_MET')) {
                console.error(`❌ Error checking order #${orderId}:`, error.message);
            }
        }
    }

    async canExecuteOrder(order) {
        try {
            // Get current AMM price
            const reserves = await this.contract.getReserves(order.tokenIn, order.tokenOut);

            // Calculate output using x*y=k formula with 0.3% fee
            const amountInWithFee = order.amountIn * 997n;
            const numerator = amountInWithFee * reserves[1];
            const denominator = reserves[0] * 1000n + amountInWithFee;
            const amountOut = numerator / denominator;

            // Check if we can meet the minimum
            const canExecute = amountOut >= order.minAmountOut;

            if (canExecute) {
                const executorFee = amountOut / 1000n; // 0.1% fee
                console.log(`   💰 Potential profit for #${order.id}: ${ethers.formatUnits(executorFee, 18)} tokens`);
            }

            return canExecute;
        } catch (error) {
            return false;
        }
    }

    async executeOrder(orderId) {
        try {
            // Double check before sending tx to save gas
            if (this.finalizedOrders.has(orderId.toString())) return;

            const tx = await this.contract.executeOrder(orderId, {
                gasLimit: 600000,
            });

            console.log(`   📤 TX sent: ${tx.hash}`);
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`   ✅ Order #${orderId} executed successfully!`);
                this.finalizedOrders.add(orderId.toString());

                // Find OrderExecuted event to get exact profit
                const event = receipt.logs.find(log => {
                    try {
                        const parsed = this.contract.interface.parseLog(log);
                        return parsed.name === 'OrderExecuted';
                    } catch {
                        return false;
                    }
                });

                if (event) {
                    const parsed = this.contract.interface.parseLog(event);
                    const amountOut = parsed.args.amountOut;
                    const executorFee = amountOut / 1000n;
                    console.log(`   💵 Earned: ${ethers.formatUnits(executorFee, 18)} tokens\n`);
                }
            } else {
                console.log(`   ❌ Transaction failed\n`);
            }
        } catch (error) {
            console.error(`   ❌ Execution failed:`, error.message, '\n');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        console.log('\n🛑 Stopping bot...');
        this.isRunning = false;
        this.contract.removeAllListeners();
    }
}

// Main execution
if (require.main === module) {
    if (!CONFIG.privateKey || !CONFIG.singletonSwapAddress) {
        console.error('❌ Missing required environment variables:');
        console.error('   PRIVATE_KEY');
        console.error('   SINGLETON_SWAP_ADDRESS');
        process.exit(1);
    }

    const bot = new OrderExecutionBot();

    // Graceful shutdown
    process.on('SIGINT', () => {
        bot.stop();
        process.exit(0);
    });

    bot.start().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = OrderExecutionBot;

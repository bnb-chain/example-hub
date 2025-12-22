
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// Configuration
const RPC_URL = "https://bsc-testnet.publicnode.com"; // BSC Testnet
// In a real hackathon env, these keys would be in .env. 
// For this demo script, we assume the user provides them or we mock them.
const PRIVATE_KEY = process.env.AI_PRIVATE_KEY || "0x000000000000000000000000000000000000000000000000000000000000dead";
const AGENT_ADDRESS = process.env.AGENT_ADDRESS || "";

async function main() {
    console.log("🤖 AgentOne AI Worker Starting...");
    console.log(`📡 Connecting to: ${RPC_URL}`);

    if (PRIVATE_KEY === "0x000000000000000000000000000000000000000000000000000000000000dead") {
        console.warn("⚠️  WARNING: Using default unsafe private key. Please set AI_PRIVATE_KEY in .env");
    }

    if (!AGENT_ADDRESS) {
        console.error("❌ CRTICAL: Missing AGENT_ADDRESS in .env. Skipping logic.");
        // We don't exit to keep the process alive for demo if needed, but it won't do much.
        // return; 
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`🔑 AI Wallet: ${wallet.address}`);

    // Simulate main loop
    console.log("🧠 Thinking... Monitoring Market Volatility...");

    // Mock Price Check Loop
    let volatility = 0;
    setInterval(async () => {
        // Mocking random volatility
        const change = (Math.random() * 2 - 1).toFixed(2); // -1% to +1%
        console.log(`📉 BNB/USDT Variance: ${change}%`);

        if (Math.abs(parseFloat(change)) > 0.8) {
            console.log("🚨 VOLATILITY DETECTED! Triggering Rebalance...");
            if (AGENT_ADDRESS) {
                await executeRebalance(wallet, AGENT_ADDRESS);
            } else {
                console.log("⚠️ No Agent Address configured. Skipping TX.");
            }
        }
    }, 3000);
}

async function executeRebalance(wallet: ethers.Wallet, agentAddr: string) {
    const abi = ["function executeRebalance(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee) external"];
    const contract = new ethers.Contract(agentAddr, abi, wallet);

    try {
        console.log("⚡ Broadcasting Transaction to Rebalance Portfolio...");
        // Mock Params for demo
        const tx = await contract.executeRebalance(
            "0x0000000000000000000000000000000000000000", // Zero for BNB
            "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // USDT on Testnet (Example)
            ethers.parseEther("0.01"),
            500 // 0.05% fee
        );
        console.log(`✅ TX Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`🎉 Rebalance Complete! Profit Secured.`);
    } catch (e) {
        console.error("❌ Transaction Failed:", e);
    }
}

main();

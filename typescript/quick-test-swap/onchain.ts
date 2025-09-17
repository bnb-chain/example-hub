// onchain.ts
import { ethers } from "ethers";
import { addresses } from "./onchain-addresses";
import { routerAbi } from "./onchain-abi";
import * as dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(
  "https://data-seed-prebsc-1-s1.binance.org:8545",
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
const router = new ethers.Contract(addresses.router, routerAbi, wallet);

// Quote function
export async function quoteBNBToCAKE(amountIn: string, slippage: number) {
  const path = [addresses.WBNB, addresses.CAKE];
  const amounts = await router.getAmountsOut(ethers.parseEther(amountIn), path);
  const quotedOut = Number(ethers.formatEther(amounts[1]));
  const minOut = quotedOut * (1 - slippage / 100);

  console.log("=== Quote ===");
  console.log("Amount In:", amountIn, "tBNB");
  console.log("Quoted Out:", quotedOut, "CAKE");
  console.log("Slippage:", slippage, "%");
  console.log("amountOutMin:", minOut, "CAKE");

  return ethers.parseEther(minOut.toString());
}

// Swap function
export async function swapBNBToCAKE(amountIn: string, slippage: number) {
  const path = [addresses.WBNB, addresses.CAKE];
  const to = await wallet.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

  console.log("⏳ Sending swap...");
  const tx = await router.swapExactETHForTokens(
    await quoteBNBToCAKE(amountIn, slippage),
    path,
    to,
    deadline,
    { value: ethers.parseEther(amountIn), gasLimit: 300000 },
  );

  console.log("Tx submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Mined in block", receipt.blockNumber);
}

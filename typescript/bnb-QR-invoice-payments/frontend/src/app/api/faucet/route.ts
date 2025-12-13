import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = process.env.BSC_RPC_URL ?? process.env.NEXT_PUBLIC_BSC_RPC ?? "https://bsc-testnet.drpc.org";
const FAUCET_PRIVATE_KEY = process.env.USDY_FAUCET_PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS;

const MINT_ABI = ["function mint(address to,uint256 amount)"];

export async function POST(request: NextRequest) {
  if (!FAUCET_PRIVATE_KEY) {
    return NextResponse.json({ error: "USDY_FAUCET_PRIVATE_KEY not configured" }, { status: 500 });
  }
  if (!TOKEN_ADDRESS) {
    return NextResponse.json({ error: "NEXT_PUBLIC_STABLECOIN_ADDRESS not configured" }, { status: 500 });
  }

  try {
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }
    const target = ethers.getAddress(address);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(TOKEN_ADDRESS, MINT_ABI, wallet);
    const amount = ethers.parseUnits("10", 18);
    const tx = await contract.mint(target, amount);
    await tx.wait();
    return NextResponse.json({ hash: tx.hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mint";
    const status = error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { paymentProcessorAbi } from "@/lib/abi/paymentProcessor";

const RPC_URL = process.env.BSC_RPC_URL ?? process.env.NEXT_PUBLIC_BSC_RPC ?? "https://bsc-testnet.drpc.org";

export async function GET(request: NextRequest) {
  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  const processor = request.nextUrl.searchParams.get("processor");

  if (!invoiceId || !processor) {
    return NextResponse.json({ error: "invoiceId and processor params are required" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(processor, paymentProcessorAbi, provider);
    const status: bigint = await contract.paymentStatus(invoiceId);
    return NextResponse.json({ status: Number(status) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read status" }, { status: 500 });
  }
}

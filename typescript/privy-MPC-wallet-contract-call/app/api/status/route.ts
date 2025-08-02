import { NextResponse } from "next/server";
import { ethers } from "ethers";

// Inline ABI with `as const` to preserve typings
const ABI = [
    {
        inputs: [],
        name: "getGameStatus",
        outputs: [
            { internalType: "uint256", name: "totalPings", type: "uint256" },
            { internalType: "uint256", name: "totalPongs", type: "uint256" },
            { internalType: "string", name: "nextMove", type: "string" },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;

// Load env vars
const PINGPONG_ADDRESS = process.env.PINGPONG_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;

export async function GET() {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // Contract with precise method typing
        const contract = new ethers.Contract(
            PINGPONG_ADDRESS,
            ABI,
            provider
        ) as ethers.Contract & {
            getGameStatus: () => Promise<[bigint, bigint, string]>;
        };

        const [pings, pongs, next] = await contract.getGameStatus();

        return NextResponse.json({
            pingCount: Number(pings),
            pongCount: Number(pongs),
            nextMove: next,
        });
    } catch (error) {
        console.error("Error fetching game status:", error);
        return NextResponse.json({ error: "Failed to fetch game status" }, { status: 500 });
    }
}

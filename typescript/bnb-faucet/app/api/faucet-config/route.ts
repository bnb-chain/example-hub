import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        bnbAmount: process.env.BNB_AMOUNT || "0.0001",
        cooldownHours: process.env.COOLDOWN_HOURS || "24",
        checkMainnetBalance: process.env.CHECK_MAINNET_BALANCE === "false",
        mainnetBalanceAmount: process.env.MAINNET_BALANCE_AMOUNT || "0.01"
    });
}

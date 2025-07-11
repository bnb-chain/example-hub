import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

const FAUCET_PK = process.env.FAUCET_PK!;
const BNB_RPC = process.env.BNB_RPC!;
const BNB_AMOUNT = process.env.BNB_AMOUNT || "0.0001";
const COOLDOWN_HOURS = parseInt(process.env.COOLDOWN_HOURS || "24");
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const CHECK_MAINNET_BALANCE = process.env.CHECK_MAINNET_BALANCE === "true";
const MAINNET_BALANCE_AMOUNT = process.env.MAINNET_BALANCE_AMOUNT || "0.01";
const MAINNET_RPC = process.env.MAINNET_RPC || "https://bsc-dataseed.binance.org/";

const provider = new ethers.JsonRpcProvider(BNB_RPC);
const wallet = new ethers.Wallet(FAUCET_PK, provider);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper type guard for errors
function getErrorMessage(err: unknown): string {
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    return JSON.stringify(err);
}

export async function POST(req: NextRequest) {
    const { address } = await req.json();

    if (!ethers.isAddress(address)) {
        return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Mainnet balance check
    if (CHECK_MAINNET_BALANCE) {
        try {
            const mainnetProvider = new ethers.JsonRpcProvider(MAINNET_RPC);
            const bal = await mainnetProvider.getBalance(address);
            const required = ethers.parseEther(MAINNET_BALANCE_AMOUNT);
            if (bal >= required) {
                return NextResponse.json({
                    error: "Address has enough mainnet BNB",
                    mainnetBalance: ethers.formatEther(bal),
                    required: MAINNET_BALANCE_AMOUNT
                }, { status: 403 });
            }
        } catch (err: unknown) {
            return NextResponse.json(
                { error: "Mainnet balance check failed", details: getErrorMessage(err) },
                { status: 500 }
            );
        }
    }

    // Supabase cooldown check
    try {
        const { data } = await supabase
            .from("faucet_claims")
            .select("last_claimed")
            .eq("address", address.toLowerCase())
            .single();

        const now = new Date();
        let canSend = true, timeLeft = 0;
        if (data?.last_claimed) {
            const last = new Date(data.last_claimed);
            const nextAllowed = new Date(last.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
            if (nextAllowed > now) {
                canSend = false;
                timeLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / 1000);
            }
        }

        if (!canSend) {
            return NextResponse.json({
                error: "Cooldown active",
                timeLeftSeconds: timeLeft,
                nextClaimAt: new Date(now.getTime() + timeLeft * 1000).toISOString()
            }, { status: 429 });
        }

        // Send BNB
        try {
            const tx = await wallet.sendTransaction({
                to: address,
                value: ethers.parseEther(BNB_AMOUNT)
            });

            await supabase
                .from("faucet_claims")
                .upsert(
                    [{ address: address.toLowerCase(), last_claimed: now.toISOString() }],
                    { onConflict: "address" }
                );

            return NextResponse.json({ success: true, txHash: tx.hash, amount: BNB_AMOUNT });
        } catch (err: unknown) {
            return NextResponse.json(
                { error: "Transaction failed", details: getErrorMessage(err) },
                { status: 500 }
            );
        }
    } catch (err: unknown) {
        return NextResponse.json(
            { error: "Database error", details: getErrorMessage(err) },
            { status: 500 }
        );
    }
}

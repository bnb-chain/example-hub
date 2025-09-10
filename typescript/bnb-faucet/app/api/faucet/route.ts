import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

// Load environment variables for faucet setup
const FAUCET_PK = process.env.FAUCET_PK!;                         // Faucet wallet private key
const BNB_RPC = process.env.BNB_RPC!;                             // Testnet RPC endpoint
const BNB_AMOUNT = process.env.BNB_AMOUNT || "0.0001";            // Amount to send per claim
const COOLDOWN_HOURS = parseInt(process.env.COOLDOWN_HOURS || "24"); // Cooldown duration per wallet
const SUPABASE_URL = process.env.SUPABASE_URL!;                   // Supabase project URL
const SUPABASE_KEY = process.env.SUPABASE_KEY!;                   // Supabase service key
const CHECK_MAINNET_BALANCE = process.env.CHECK_MAINNET_BALANCE === "true"; // Toggle mainnet check
const MAINNET_BALANCE_AMOUNT = process.env.MAINNET_BALANCE_AMOUNT || "0.01"; // Threshold
const MAINNET_RPC = process.env.MAINNET_RPC || "https://bsc-dataseed.binance.org/"; // Mainnet RPC

// Setup provider and wallet for testnet
const provider = new ethers.JsonRpcProvider(BNB_RPC);
const wallet = new ethers.Wallet(FAUCET_PK, provider);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Type-safe error message handler
function getErrorMessage(err: unknown): string {
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    return JSON.stringify(err);
}

// Faucet request endpoint
export async function POST(req: NextRequest) {
    const { address } = await req.json();

    // 1. Validate that the address is correct
    if (!ethers.isAddress(address)) {
        return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // 2. Optionally check the user's balance on BNB mainnet
    if (CHECK_MAINNET_BALANCE) {
        try {
            const mainnetProvider = new ethers.JsonRpcProvider(MAINNET_RPC);
            const bal = await mainnetProvider.getBalance(address);
            const required = ethers.parseEther(MAINNET_BALANCE_AMOUNT);

            if (bal >= required) {
                return NextResponse.json(
                    {
                        error: "Address has enough mainnet BNB",
                        mainnetBalance: ethers.formatEther(bal),
                        required: MAINNET_BALANCE_AMOUNT,
                    },
                    { status: 403 }
                );
            }
        } catch (err: unknown) {
            return NextResponse.json(
                { error: "Mainnet balance check failed", details: getErrorMessage(err) },
                { status: 500 }
            );
        }
    }

    // 3. Check cooldown for this address
    try {
        const { data } = await supabase
            .from("faucet_claims")
            .select("last_claimed")
            .eq("address", address.toLowerCase())
            .single();

        const now = new Date();
        let canSend = true;
        let timeLeft = 0;

        if (data?.last_claimed) {
            const last = new Date(data.last_claimed);
            const nextAllowed = new Date(last.getTime() + COOLDOWN_HOURS * 3600 * 1000);

            if (nextAllowed > now) {
                canSend = false;
                timeLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / 1000); // seconds
            }
        }

        if (!canSend) {
            return NextResponse.json(
                {
                    error: "Cooldown active",
                    timeLeftSeconds: timeLeft,
                    nextClaimAt: new Date(now.getTime() + timeLeft * 1000).toISOString(),
                },
                { status: 429 }
            );
        }

        // 4. Check if the faucet wallet has enough funds
        try {
            const faucetBalance = await provider.getBalance(wallet.address);
            const amountToSend = ethers.parseEther(BNB_AMOUNT);

            if (faucetBalance < amountToSend) {
                return NextResponse.json(
                    {
                        error: "Faucet depleted",
                        message:
                            "Faucet wallet has insufficient balance. Please contact the maintainer or try again later.",
                        currentBalance: ethers.formatEther(faucetBalance),
                        required: BNB_AMOUNT,
                    },
                    { status: 503 }
                );
            }

            // 5. Send BNB to user address
            const tx = await wallet.sendTransaction({
                to: address,
                value: amountToSend,
            });

            // 6. Update claim history in Supabase
            await supabase.from("faucet_claims").upsert(
                [
                    {
                        address: address.toLowerCase(),
                        last_claimed: now.toISOString(),
                    },
                ],
                { onConflict: "address" }
            );

            // 7. Return success response
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

/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [nextClaim, setNextClaim] = useState<string | null>(null);
  const [faucetDetails, setFaucetDetails] = useState<{
    currentBalance?: string;
    required?: string;
  } | null>(null);

  const handleFaucet = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    setCooldown(null);
    setNextClaim(null);
    setFaucetDetails(null);

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();

      if (res.ok) {
        setTxHash(data.txHash);
      } else if (data.error === "Cooldown active") {
        setCooldown(data.timeLeftSeconds);
        setNextClaim(data.nextClaimAt);
        setError("Cooldown: You must wait before claiming again.");
      } else if (data.error === "Address has enough mainnet BNB") {
        setError(
          `Not eligible: Address already has ≥ ${data.required} BNB on mainnet (current: ${data.mainnetBalance}).`
        );
      } else if (data.error === "Faucet depleted") {
        setError(data.message || "Faucet wallet is empty. Please contact the maintainer or try again later.");
        setFaucetDetails({
          currentBalance: data.currentBalance,
          required: data.required,
        });
      } else if (data.error) {
        setError(data.error + (data.details ? `: ${data.details}` : ""));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    }

    setLoading(false);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-sans bg-gradient-to-b from-blue-50 to-white dark:from-zinc-900 dark:to-black">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-md">
        <img src="/bnb.svg" alt="BNB Faucet" className="w-20 h-20 mb-2" />
        <h1 className="text-2xl font-bold text-center">BNB Testnet Faucet</h1>
        <p className="text-center text-zinc-500 mb-2">
          Enter your testnet wallet address to receive test BNB.<br />
          <span className="text-xs">Limit: 0.001 BNB every 24 hours per address</span>
        </p>
        <input
          className="w-full rounded border border-zinc-300 px-4 py-2 mb-2 focus:outline-none focus:border-blue-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
        <button
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleFaucet}
          disabled={loading || !address}
        >
          {loading ? "Requesting..." : "Request Faucet"}
        </button>

        {/* ✅ Success */}
        {txHash && (
          <div className="w-full mt-4 rounded bg-green-100 text-green-900 px-3 py-2">
            ✅ Success! <br />
            Tx:{" "}
            <a
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://testnet.bscscan.com/tx/${txHash}`}
            >
              View on BscScan
            </a>
          </div>
        )}

        {/* ❌ Error or Depleted */}
        {error && (
          <div className="w-full mt-4 rounded bg-red-100 text-red-900 px-3 py-2">
            ❌ {error}
            {cooldown && nextClaim && (
              <div className="text-xs mt-2">
                Try again in ~{Math.ceil(cooldown / 60)} min (
                {new Date(nextClaim).toLocaleString()})
              </div>
            )}
            {faucetDetails?.currentBalance && (
              <div className="text-xs mt-2">
                Faucet balance: {faucetDetails.currentBalance} BNB<br />
                Required: {faucetDetails.required} BNB
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="row-start-3 text-xs text-zinc-400 text-center">
        Powered by BNB Chain Testnet &bull; Demo Faucet
      </footer>
    </div>
  );
}

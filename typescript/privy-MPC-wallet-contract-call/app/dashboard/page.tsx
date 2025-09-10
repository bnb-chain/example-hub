"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { Interface } from "ethers";
import toast, { Toaster } from "react-hot-toast";

const abi = ["function ping() external", "function pong() external"];
const contractAddress = process.env.NEXT_PUBLIC_PINGPONG_CONTRACT_ADDRESS!;
const chainId = 97;
const explorerBase = "https://testnet.bscscan.com/tx/";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const iface = useMemo(() => new Interface(abi), []);
  const { sendTransaction } = useSendTransaction();

  const [game, setGame] = useState({
    pingCount: 0,
    pongCount: 0,
    nextMove: "",
  });

  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
    else if (ready && authenticated) fetchStatus();
  }, [ready, authenticated]);

  useEffect(() => {
    if (txHash) {
      toast.success(
        <span>
          Tx Confirmed:{" "}
          <a
            href={`${explorerBase}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-yellow-300"
          >
            View on BscScan
          </a>
        </span>,
        {
          icon: "🏓",
        }
      );
      setTxHash(null);
    }
  }, [txHash]);

  const fetchStatus = async () => {
    const res = await fetch("/api/status");
    const data = await res.json();
    setGame(data);
  };

  const handleMove = async (move: "ping" | "pong") => {
    try {
      const data = iface.encodeFunctionData(move, []);
      const tx = await sendTransaction({
        to: contractAddress,
        data,
        value: BigInt(0),
        chainId,
      });

      if (tx.hash) {
        console.log("Tx hash:", tx.hash);
        setTxHash(tx.hash);
      }

      await fetchStatus();
    } catch (err) {
      console.error("Transaction Error:", err);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center px-4 relative z-[999999]">
      <Toaster position="top-center" toastOptions={{ className: "!z-[999999]" }} />
      {authenticated ? (
        <div className="w-full max-w-lg">
          {/* BNB Faucet link */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400">
              Need testnet BNB?{" "}
              <a
                href="https://bnb-faucet.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-yellow-400 hover:text-yellow-300 font-medium"
              >
                Get it from the BNB Faucet 🔗
              </a>
            </p>
          </div>

          {/* Interaction box */}
          <div className="bg-[#1a1a1a] border border-yellow-400/30 rounded-2xl shadow-xl p-8 sm:p-10 text-center relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={logout}
                className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs px-4 py-2 rounded-md font-semibold shadow transition"
              >
                Logout
              </button>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-yellow-400 mb-2 tracking-wide">
              BNB Ping Pong 🏓
            </h1>
            <p className="text-sm text-gray-400 mb-6">Let’s keep the rally going</p>

            <div className="text-left mb-6">
              <p className="text-xs text-gray-500 mb-1">Connected Wallet:</p>
              <p className="text-yellow-300 font-mono text-sm break-all">
                {user?.wallet?.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0d0d0d] border border-yellow-400/10 rounded-md p-4 shadow-inner">
                <p className="text-2xl font-bold text-yellow-300">{game.pingCount}</p>
                <p className="text-xs text-gray-400 mt-1">Total Pings</p>
              </div>
              <div className="bg-[#0d0d0d] border border-yellow-400/10 rounded-md p-4 shadow-inner">
                <p className="text-2xl font-bold text-yellow-300">{game.pongCount}</p>
                <p className="text-xs text-gray-400 mt-1">Total Pongs</p>
              </div>
            </div>

            <p className="text-sm text-gray-400">Next move:</p>
            <p className="text-xl font-semibold text-yellow-300 mb-6">{game.nextMove}</p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleMove("ping")}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg shadow transition hover:scale-105"
              >
                Ping
              </button>
              <button
                onClick={() => handleMove("pong")}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg shadow transition hover:scale-105"
              >
                Pong
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

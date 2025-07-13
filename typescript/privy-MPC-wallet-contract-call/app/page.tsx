/* eslint-disable @next/next/no-img-element */
"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: () => router.push("/dashboard"),
  });

  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      // Avoid hydration mismatch by wrapping inside requestAnimationFrame
      requestAnimationFrame(() => router.push("/dashboard"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]); // removed router from dependencies

  return (
    <main className="flex min-h-screen min-w-full bg-[#0d0d0d] text-white">
      <div className="flex flex-1 p-6 justify-center items-center relative">
        {/* Logo */}
        <div className="absolute top-6 left-6 flex items-center space-x-3">
          <img src="/bnb-logo.webp" alt="BNB Logo" className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-yellow-400 tracking-wide">
            BNB PING PONG
          </h1>
        </div>

        {/* Login Box */}
        <div className="bg-[#1a1a1a] rounded-xl shadow-lg p-10 w-full max-w-sm border border-yellow-400/20">
          <h2 className="text-center text-3xl font-semibold text-yellow-400 mb-8">
            Connect Wallet
          </h2>
          <div className="flex justify-center">
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-yellow-300 transition"
              onClick={login}
            >
              Log in with Privy
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

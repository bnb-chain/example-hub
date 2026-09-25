'use client';
import Navbar from "@/components/Navbar";
import SwapCard from "@/components/SwapCard";
import LiquidityCard from "@/components/LiquidityCard";
import LimitOrderCard from "@/components/LimitOrderCard";
import { useState } from "react";

export default function Home() {
    const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'orders'>('swap');

    return (
        <main className="flex min-h-screen flex-col items-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#F0B90B] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

            <Navbar />

            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 mb-20 z-10">
                {/* Tabs */}
                <div className="flex gap-4 mb-6 bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                    <button
                        onClick={() => setActiveTab('swap')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'swap' ? 'bg-[#F0B90B] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Swap
                    </button>
                    <button
                        onClick={() => setActiveTab('liquidity')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'liquidity' ? 'bg-[#F0B90B] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Liquidity
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'orders' ? 'bg-[#F0B90B] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        📊 Orders
                    </button>
                </div>

                {activeTab === 'swap' && <SwapCard />}
                {activeTab === 'liquidity' && <LiquidityCard />}
                {activeTab === 'orders' && <LimitOrderCard />}
            </div>
        </main>
    );
}

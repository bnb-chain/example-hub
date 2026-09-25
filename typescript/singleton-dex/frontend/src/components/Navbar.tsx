'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
    return (
        <nav className="flex items-center justify-between p-6 w-full max-w-7xl mx-auto z-10">
            <div className="flex items-center gap-3">
                {/* Placeholder for BNB Logo */}
                <div className="w-10 h-10 bg-[#F0B90B] rounded-full flex items-center justify-center font-bold text-black border-2 border-white/10 shadow-[0_0_15px_rgba(240,185,11,0.5)]">
                    B
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F0B90B] to-[#FFE589] bg-clip-text text-transparent">
                    BNBSWAP
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <ConnectButton
                    showBalance={false}
                    accountStatus="address"
                    chainStatus="icon"
                />
            </div>
        </nav>
    );
}

'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Dashboard } from './Dashboard';

export function MainContent() {
    const { isConnected } = useAccount();

    return (
        <main className="min-h-screen p-4 md:p-8 lg:p-12">
            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-bold bnb-gradient-text text-shadow">
                        BNB Lend
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Supply, borrow, and earn on BNB Chain
                    </p>
                </div>
                <div className="scale-100 hover:scale-105 transition-transform">
                    <ConnectButton />
                </div>
            </header>

            {/* Main Content */}
            {isConnected ? (
                <Dashboard />
            ) : (
                <div className="flex flex-col items-center justify-center mt-20">
                    <div className="glass rounded-3xl p-12 md:p-16 text-center max-w-lg w-full mx-auto animate-in fade-in duration-700">
                        <div className="mb-8 text-7xl animate-bounce">🔐</div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-shadow">
                            Connect Your Wallet
                        </h2>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            Connect your wallet to start supplying and borrowing assets on BNB Chain
                        </p>
                        <div className="flex justify-center">
                            <ConnectButton />
                        </div>

                        <div className="mt-12 grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
                            <div className="text-center">
                                <div className="text-2xl font-bold bnb-gradient-text">75%</div>
                                <div className="text-xs text-gray-500 mt-1">Max LTV</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">Secure</div>
                                <div className="text-xs text-gray-500 mt-1">Tested</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">DeFi</div>
                                <div className="text-xs text-gray-500 mt-1">Protocol</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

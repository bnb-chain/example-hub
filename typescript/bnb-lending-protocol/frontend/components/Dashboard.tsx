'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, ASSETS } from '@/config/addresses';
import { LENDING_POOL_ABI } from '@/config/contracts';
import { AssetCard } from './AssetCard';
import { formatEther } from 'viem';

export function Dashboard() {
    const { address } = useAccount();

    // Read account info
    const { data: accountInfo } = useReadContract({
        address: CONTRACTS.LENDING_POOL as `0x${string}`,
        abi: LENDING_POOL_ABI,
        functionName: 'getAccountInfo',
        args: address ? [address] : undefined,
    });

    const totalCollateral = accountInfo ? accountInfo[0] : BigInt(0);
    const totalBorrowed = accountInfo ? accountInfo[1] : BigInt(0);

    const healthFactor = totalBorrowed > 0
        ? Number((totalCollateral * BigInt(100)) / totalBorrowed) / 100
        : 0;

    const getHealthFactorColor = (hf: number) => {
        if (totalBorrowed === BigInt(0)) return 'text-gray-400';
        if (hf > 1.5) return 'text-green-400';
        if (hf > 1) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="stat-card group">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-gray-400 text-sm font-medium">Total Supplied</p>
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-green-400 text-xl">💰</span>
                        </div>
                    </div>
                    <p className="text-4xl font-bold text-green-400 mb-1">
                        ${totalCollateral ? parseFloat(formatEther(totalCollateral)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Available as collateral</p>
                </div>

                <div className="stat-card group">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-gray-400 text-sm font-medium">Total Borrowed</p>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-red-400 text-xl">📊</span>
                        </div>
                    </div>
                    <p className="text-4xl font-bold text-red-400 mb-1">
                        ${totalBorrowed ? parseFloat(formatEther(totalBorrowed)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Current debt</p>
                </div>

                <div className="stat-card group">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-gray-400 text-sm font-medium">Health Factor</p>
                        <div className="w-10 h-10 rounded-full bg-bnb-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-bnb-500 text-xl">❤️</span>
                        </div>
                    </div>
                    <p className={`text-4xl font-bold mb-1 ${getHealthFactorColor(healthFactor)}`}>
                        {totalBorrowed > 0 ? healthFactor.toFixed(2) : '∞'}
                    </p>
                    <p className="text-xs text-gray-500">
                        {totalBorrowed > 0
                            ? healthFactor > 1.5 ? 'Healthy' : healthFactor > 1 ? 'Monitor' : 'At Risk'
                            : 'No debt'
                        }
                    </p>
                </div>
            </div>

            {/* Asset Cards */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-shadow">Your Assets</h2>
                    <div className="px-4 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                        <span className="text-sm text-gray-400">BSC Testnet</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {ASSETS.map((asset) => (
                        <AssetCard key={asset.address} asset={asset} />
                    ))}
                </div>
            </div>
        </div>
    );
}

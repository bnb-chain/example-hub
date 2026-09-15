'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/addresses';
import { LENDING_POOL_ABI, ERC20_ABI } from '@/config/contracts';
import { formatUnits } from 'viem';
import { ActionModal } from './ActionModal';

interface Asset {
    symbol: string;
    name: string;
    address: string;
    icon: string;
}

export function AssetCard({ asset }: { asset: Asset }) {
    const { address } = useAccount();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'supply' | 'borrow' | 'withdraw' | 'repay'>('supply');

    // Faucet functionality
    const { writeContract: callFaucet, data: faucetHash, isPending: isFaucetPending } = useWriteContract();
    const { isLoading: isFaucetConfirming, isSuccess: faucetSuccess } = useWaitForTransactionReceipt({
        hash: faucetHash,
    });

    // Read user's wallet balance
    const { data: walletBalance, refetch: refetchBalance } = useReadContract({
        address: asset.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Read user's deposits
    const { data: depositBalance } = useReadContract({
        address: CONTRACTS.LENDING_POOL as `0x${string}`,
        abi: LENDING_POOL_ABI,
        functionName: 'deposits',
        args: address ? [address, asset.address as `0x${string}`] : undefined,
    });

    // Read user's borrows
    const { data: borrowBalance } = useReadContract({
        address: CONTRACTS.LENDING_POOL as `0x${string}`,
        abi: LENDING_POOL_ABI,
        functionName: 'borrowings',
        args: address ? [address, asset.address as `0x${string}`] : undefined,
    });

    const openModal = (action: typeof modalAction) => {
        setModalAction(action);
        setModalOpen(true);
    };

    const handleFaucet = () => {
        callFaucet({
            address: asset.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'faucet',
        });
    };

    // Refetch balance after faucet success
    if (faucetSuccess) {
        refetchBalance();
    }

    const formatBalance = (balance: bigint | undefined) => {
        if (!balance) return '0.00';
        const formatted = formatUnits(balance, 18);
        const num = parseFloat(formatted);
        if (num === 0) return '0.00';
        if (num < 0.01) return '<0.01';
        if (num > 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num > 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    return (
        <>
            <div className="glass glass-hover rounded-2xl p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-bnb-500/20 to-bnb-600/20 rounded-2xl flex items-center justify-center text-4xl border border-bnb-500/30">
                            {asset.icon}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-shadow">{asset.symbol}</h3>
                            <p className="text-gray-500 text-sm">{asset.name}</p>
                        </div>
                    </div>
                    {/* Faucet Button */}
                    <button
                        onClick={handleFaucet}
                        disabled={isFaucetPending || isFaucetConfirming}
                        className="action-button action-button-faucet animate-pulse-glow flex items-center gap-2"
                    >
                        {isFaucetPending || isFaucetConfirming ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Minting...
                            </>
                        ) : (
                            <>🚰 Get Free Tokens</>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b border-white/10">
                    <div className="text-center">
                        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Wallet</p>
                        <p className="font-bold text-lg">{formatBalance(walletBalance)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Supplied</p>
                        <p className="font-bold text-lg text-green-400">
                            {formatBalance(depositBalance)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Borrowed</p>
                        <p className="font-bold text-lg text-red-400">
                            {formatBalance(borrowBalance)}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-3">
                        <button
                            onClick={() => openModal('supply')}
                            className="action-button action-button-primary w-full"
                        >
                            💰 Supply
                        </button>
                        <button
                            onClick={() => openModal('withdraw')}
                            disabled={!depositBalance || depositBalance === BigInt(0)}
                            className="action-button action-button-secondary w-full"
                        >
                            📤 Withdraw
                        </button>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => openModal('borrow')}
                            className="action-button action-button-borrow w-full"
                        >
                            📥 Borrow
                        </button>
                        <button
                            onClick={() => openModal('repay')}
                            disabled={!borrowBalance || borrowBalance === BigInt(0)}
                            className="action-button action-button-secondary w-full"
                        >
                            💳 Repay
                        </button>
                    </div>
                </div>
            </div>

            <ActionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                asset={asset}
                action={modalAction}
            />
        </>
    );
}

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/addresses';
import { LENDING_POOL_ABI, ERC20_ABI } from '@/config/contracts';
import { parseUnits } from 'viem';

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: { symbol: string; name: string; address: string; icon: string };
    action: 'supply' | 'borrow' | 'withdraw' | 'repay';
}

export function ActionModal({ isOpen, onClose, asset, action }: ActionModalProps) {
    const { address } = useAccount();
    const [amount, setAmount] = useState('');
    const { writeContract, data: hash, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    // Check allowance for supply/repay actions
    const { data: allowance } = useReadContract({
        address: asset.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, CONTRACTS.LENDING_POOL as `0x${string}`] : undefined,
    });

    const needsApproval = (action === 'supply' || action === 'repay') &&
        allowance !== undefined &&
        amount !== '' &&
        allowance < parseUnits(amount, 18);

    const handleApprove = async () => {
        writeContract({
            address: asset.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.LENDING_POOL as `0x${string}`, parseUnits(amount, 18)],
        });
    };

    const handleAction = async () => {
        const amountBigInt = parseUnits(amount, 18);

        writeContract({
            address: CONTRACTS.LENDING_POOL as `0x${string}`,
            abi: LENDING_POOL_ABI,
            functionName: action === 'supply' ? 'deposit' : action,
            args: [asset.address as `0x${string}`, amountBigInt],
        });
    };

    if (!isOpen) return null;

    const actionLabels = {
        supply: 'Supply',
        borrow: 'Borrow',
        withdraw: 'Withdraw',
        repay: 'Repay',
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="glass rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">{asset.icon}</div>
                        <div>
                            <h2 className="text-2xl font-bold text-shadow">
                                {actionLabels[action]}
                            </h2>
                            <p className="text-sm text-gray-500">{asset.symbol}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Input */}
                <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-3 font-medium">Amount</label>
                    <div className="glass rounded-2xl p-5 border-2 border-transparent focus-within:border-bnb-500/50 transition-colors">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent outline-none text-3xl font-bold text-white placeholder:text-gray-600"
                            step="any"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-gray-500 text-sm">{asset.name}</span>
                            <span className="text-bnb-500 font-semibold">{asset.symbol}</span>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {isSuccess && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl animate-in slide-in-from-top duration-300">
                        <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                            <span>✓</span> Transaction successful!
                        </p>
                    </div>
                )}

                {/* Action Button */}
                {needsApproval ? (
                    <button
                        onClick={handleApprove}
                        disabled={isPending || isConfirming || !amount}
                        className="action-button-primary w-full text-lg"
                    >
                        {isPending || isConfirming ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Approving...
                            </span>
                        ) : (
                            `Approve ${asset.symbol}`
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleAction}
                        disabled={isPending || isConfirming || !amount}
                        className="action-button-primary w-full text-lg"
                    >
                        {isPending || isConfirming ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Confirming...
                            </span>
                        ) : (
                            actionLabels[action]
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatEther, parseEther, Address, zeroAddress, erc20Abi } from 'viem';
import { SINGLETON_ABI } from '../constants/abi';
import { SINGLETON_ADDRESS } from '../constants/tokens';
import { useTokenList } from '../hooks/useTokenList';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { TokenSelector } from './TokenSelector';

interface Position {
    key: string;
    token0: Address;
    token1: Address;
    liquidity: bigint;
    reserve0: bigint;
    reserve1: bigint;
    symbol0: string;
    symbol1: string;
}

export default function LiquidityCard() {
    const { address, isConnected } = useAccount();
    const { tokens: displayTokens } = useTokenList();
    const [view, setView] = useState<'positions' | 'add'>('positions');
    const [transferModal, setTransferModal] = useState<{ open: boolean; position: any | null }>({ open: false, position: null });
    const [removeModal, setRemoveModal] = useState<{ open: boolean; position: Position | null }>({ open: false, position: null });
    const [removePercent, setRemovePercent] = useState('100');
    const [transferTo, setTransferTo] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const userAddress: Address = address ?? zeroAddress;
    const ownerAddress = address as Address | undefined;
    const [pendingApproval, setPendingApproval] = useState<'A' | 'B' | null>(null);

    // Fetch user positions
    const { data: positions, refetch: refetchPositions } = useReadContract({
        address: SINGLETON_ADDRESS,
        abi: SINGLETON_ABI,
        functionName: 'getUserPositions',
        args: [userAddress],
        query: {
            enabled: !!address,
        }
    });

    const [tokenA, setTokenA] = useState<any>(null);
    const [tokenB, setTokenB] = useState<any>(null);
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');

    useEffect(() => {
        if (displayTokens.length > 0) {
            if (!tokenA) setTokenA(displayTokens[0]);
            if (!tokenB && displayTokens.length > 1) setTokenB(displayTokens[1]);
        }
    }, [displayTokens]);

    const tokenABalance = useTokenBalance(ownerAddress, tokenA);
    const tokenBBalance = useTokenBalance(ownerAddress, tokenB);

    const formatBalanceDisplay = (value: string) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0) return '0';
        if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, '');
        return num.toPrecision(3);
    };

    const { writeContract, data: hash, isPending: isConfirming } = useWriteContract();
    const {
        writeContract: writeApproval,
        data: approvalHash,
        isPending: isApprovalPending,
    } = useWriteContract();
    const { isLoading: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { isLoading: isApprovalConfirmed } = useWaitForTransactionReceipt({
        hash: approvalHash,
    });

    useEffect(() => {
        if (isConfirmed) {
            setView('positions');
            refetchPositions();
        }
    }, [isConfirmed, refetchPositions]);

    const isNative = (token?: { address: Address }) =>
        token?.address?.toLowerCase() === zeroAddress.toLowerCase();

    const {
        data: allowanceTokenA = 0n,
        refetch: refetchAllowanceA,
    } = useReadContract({
        address: tokenA?.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address ?? zeroAddress, SINGLETON_ADDRESS],
        query: {
            enabled: !!address && !!tokenA && !isNative(tokenA),
        },
    });

    const {
        data: allowanceTokenB = 0n,
        refetch: refetchAllowanceB,
    } = useReadContract({
        address: tokenB?.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address ?? zeroAddress, SINGLETON_ADDRESS],
        query: {
            enabled: !!address && !!tokenB && !isNative(tokenB),
        },
    });

    const parsedAmountA = (() => {
        if (!amountA || !tokenA) return 0n;
        try {
            return parseUnits(amountA, tokenA.decimals ?? 18);
        } catch {
            return 0n;
        }
    })();

    const parsedAmountB = (() => {
        if (!amountB || !tokenB) return 0n;
        try {
            return parseUnits(amountB, tokenB.decimals ?? 18);
        } catch {
            return 0n;
        }
    })();

    const needsApprovalA =
        !!address &&
        !!tokenA &&
        !isNative(tokenA) &&
        parsedAmountA > allowanceTokenA;

    const needsApprovalB =
        !!address &&
        !!tokenB &&
        !isNative(tokenB) &&
        parsedAmountB > allowanceTokenB;

    useEffect(() => {
        if (isApprovalConfirmed) {
            if (pendingApproval === 'A') refetchAllowanceA();
            if (pendingApproval === 'B') refetchAllowanceB();
            setPendingApproval(null);
        }
    }, [isApprovalConfirmed, pendingApproval, refetchAllowanceA, refetchAllowanceB]);

    const handleTransferLP = () => {
        if (!transferTo || !transferAmount || !transferModal.position) return;

        writeContract({
            address: SINGLETON_ADDRESS,
            abi: SINGLETON_ABI,
            functionName: 'transferLP',
            args: [
                transferModal.position.key as `0x${string}`,
                transferTo as Address,
                parseEther(transferAmount)
            ] as any,
        });

        // Close modal
        setTransferModal({ open: false, position: null });
        setTransferTo('');
        setTransferAmount('');
    };

    const handleRemoveLiquidity = () => {
        if (
            !isConnected ||
            !address ||
            !removeModal.position ||
            removeModal.position.liquidity === 0n
        )
            return;
        const percent = parseFloat(removePercent);
        if (Number.isNaN(percent) || percent <= 0) return;

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
        const liquidity = (removeModal.position.liquidity * BigInt(Math.min(percent, 100))) / 100n;
        const token0 = removeModal.position.token0;
        const token1 = removeModal.position.token1;
        const involvesNative = token0 === zeroAddress || token1 === zeroAddress;

        if (involvesNative) {
            const token = token0 === zeroAddress ? token1 : token0;
            writeContract({
                address: SINGLETON_ADDRESS,
                abi: SINGLETON_ABI,
                functionName: 'removeLiquidityETH',
                args: [
                    token,
                    liquidity,
                    0n,
                    0n,
                    address,
                    deadline
                ] as any,
            });
        } else {
            writeContract({
                address: SINGLETON_ADDRESS,
                abi: SINGLETON_ABI,
                functionName: 'removeLiquidity',
                args: [
                    token0,
                    token1,
                    liquidity,
                    0n,
                    0n,
                    address,
                    deadline
                ] as any,
            });
        }

        setRemoveModal({ open: false, position: null });
        setRemovePercent('100');
    };

    const handleAddLiquidity = () => {
        // ... existing logic
        if (!amountA || !amountB || !isConnected || !tokenA || !tokenB || !address) return;

        // Use selected tokens
        const token0 = tokenA;
        const token1 = tokenB;

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

        if (isNative(token0)) {
            writeContract({
                address: SINGLETON_ADDRESS,
                abi: SINGLETON_ABI,
                functionName: 'addLiquidityETH',
                args: [
                    token1.address as Address,
                    parsedAmountB,
                    0n,
                    0n,
                    address,
                    deadline
                ] as any,
                value: parsedAmountA,
            });
        } else if (isNative(token1)) {
            writeContract({
                address: SINGLETON_ADDRESS,
                abi: SINGLETON_ABI,
                functionName: 'addLiquidityETH',
                args: [
                    token0.address as Address,
                    parsedAmountA,
                    0n,
                    0n,
                    address,
                    deadline
                ] as any,
                value: parsedAmountB,
            });
        } else {
            writeContract({
                address: SINGLETON_ADDRESS,
                abi: SINGLETON_ABI,
                functionName: 'addLiquidity',
                args: [
                    token0.address as Address,
                    token1.address as Address,
                    parsedAmountA,
                    parsedAmountB,
                    0n,
                    0n,
                    address,
                    deadline
                ] as any,
            });
        }
    };

    const handleApproveToken = (target: 'A' | 'B') => {
        const token = target === 'A' ? tokenA : tokenB;
        const amount = target === 'A' ? parsedAmountA : parsedAmountB;
        if (!token || token.symbol === 'BNB' || !address || amount === 0n) return;
        setPendingApproval(target);
        writeApproval({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [SINGLETON_ADDRESS, amount],
        });
    };

    const approvalTarget = needsApprovalA ? 'A' : needsApprovalB ? 'B' : null;

    if (view === 'positions') {
        return (
            <>
                <div className="glass-panel w-full max-w-[600px] p-6 text-white mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">My Positions</h2>
                        <button
                            onClick={() => setView('add')}
                            className="bg-[#F0B90B] hover:bg-[#D9A505] text-black font-bold px-4 py-2 rounded-xl text-sm transition-all"
                        >
                            + Add Liquidity
                        </button>
                    </div>

                    {!isConnected ? (
                        <div className="text-center text-gray-400 py-10">
                            Connect wallet to view positions.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(!positions || (positions as any[]).length === 0) ? (
                                <div className="text-center text-gray-400 py-10 bg-black/20 rounded-xl border border-white/5">
                                    No active liquidity positions found.
                                </div>
                            ) : (
                                (positions as any[]).map((pos: any, idx: number) => (
                                    <div key={idx} className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-[#F0B90B]/30 transition-all flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-[#1a1b23] text-xs font-bold">{pos.symbol0[0]}</div>
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-[#1a1b23] text-xs font-bold">{pos.symbol1[0]}</div>
                                            </div>
                                            <div>
                                                <div className="font-bold">{pos.symbol0}/{pos.symbol1}</div>
                                                <div className="text-xs text-gray-400">LP Balance: {formatEther(pos.liquidity)}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            <div className="text-xs text-[#F0B90B]">Active</div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setRemoveModal({ open: true, position: pos as Position });
                                                        setRemovePercent('100');
                                                    }}
                                                    className="bg-[#ff5353]/20 hover:bg-[#ff5353]/30 text-[#ffb3b3] text-xs px-3 py-1 rounded-lg transition-all border border-[#ff5353]/30"
                                                >
                                                    Remove
                                                </button>
                                                <button
                                                    onClick={() => setTransferModal({ open: true, position: pos })}
                                                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded-lg transition-all"
                                                >
                                                    Transfer →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Transfer Modal */}
                {transferModal.open && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setTransferModal({ open: false, position: null })}>
                        <div className="bg-[#1a1b23] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Transfer LP Tokens</h3>
                                <button onClick={() => setTransferModal({ open: false, position: null })} className="text-gray-400 hover:text-white text-2xl">
                                    ×
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-400 mb-2">Position</div>
                                <div className="font-bold">{transferModal.position?.symbol0}/{transferModal.position?.symbol1}</div>
                                <div className="text-xs text-gray-400">Available: {transferModal.position ? formatEther(transferModal.position.liquidity) : '0'} LP</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Recipient Address</label>
                                    <input
                                        type="text"
                                        value={transferTo}
                                        onChange={(e) => setTransferTo(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#F0B90B]/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Amount (LP Tokens)</label>
                                    <input
                                        type="number"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#F0B90B]/50"
                                    />
                                    <button
                                        onClick={() => transferModal.position && setTransferAmount(formatEther(transferModal.position.liquidity))}
                                        className="text-xs text-[#F0B90B] hover:underline mt-1"
                                    >
                                        Max
                                    </button>
                                </div>

                                <button
                                    onClick={handleTransferLP}
                                    disabled={!transferTo || !transferAmount || isConfirming}
                                    className="primary-button w-full"
                                >
                                    {isConfirming ? 'Confirming...' : 'Transfer LP Tokens'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {removeModal.open && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setRemoveModal({ open: false, position: null })}>
                        <div className="bg-[#1a1b23] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Remove Liquidity</h3>
                                <button onClick={() => setRemoveModal({ open: false, position: null })} className="text-gray-400 hover:text-white text-2xl">
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-400">Position</div>
                                    <div className="font-bold">
                                        {removeModal.position?.symbol0}/{removeModal.position?.symbol1}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        LP Balance: {removeModal.position ? formatEther(removeModal.position.liquidity) : '0'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Remove percentage</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={removePercent}
                                        onChange={(e) => setRemovePercent(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#F0B90B]/50"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        {[25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => setRemovePercent(String(pct))}
                                                className="flex-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg py-1"
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleRemoveLiquidity}
                                    disabled={
                                        !removePercent ||
                                        Number(removePercent) <= 0 ||
                                        isConfirming
                                    }
                                    className="primary-button w-full"
                                >
                                    {isConfirming ? 'Confirming...' : 'Remove Liquidity'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="glass-panel w-full max-w-[480px] p-6 text-white mt-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('positions')} className="text-gray-400 hover:text-white transition-colors">
                    ← Back
                </button>
                <h2 className="text-xl font-bold">Add Liquidity</h2>
            </div>
            {/* ... existing ADD form ... */}
            <div className="space-y-4">
                {/* Inputs */}
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <span className="text-sm text-gray-400 block">Token A</span>
                            <span className="text-xs text-gray-500">
                                Balance: {formatBalanceDisplay(tokenABalance.formatted)}
                            </span>
                        </div>
                        <TokenSelector
                            tokens={displayTokens}
                            selected={tokenA}
                            onSelect={setTokenA}
                            placeholder="Select token"
                        />
                    </div>
                    <input
                        type="number"
                        value={amountA}
                        onChange={(e) => setAmountA(e.target.value)}
                        className="bg-transparent text-xl font-medium outline-none w-full placeholder-gray-600"
                        placeholder="0.0"
                    />
                </div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <span className="text-sm text-gray-400 block">Token B</span>
                            <span className="text-xs text-gray-500">
                                Balance: {formatBalanceDisplay(tokenBBalance.formatted)}
                            </span>
                        </div>
                        <TokenSelector
                            tokens={displayTokens}
                            selected={tokenB}
                            onSelect={setTokenB}
                            placeholder="Select token"
                        />
                    </div>
                    <input
                        type="number"
                        value={amountB}
                        onChange={(e) => setAmountB(e.target.value)}
                        className="bg-transparent text-xl font-medium outline-none w-full placeholder-gray-600"
                        placeholder="0.0"
                    />
                </div>

                {approvalTarget ? (
                    <button
                        onClick={() => handleApproveToken(approvalTarget)}
                        disabled={
                            isApprovalPending ||
                            (approvalTarget === 'A'
                                ? parsedAmountA === 0n
                                : parsedAmountB === 0n)
                        }
                        className="primary-button"
                    >
                        {isApprovalPending
                            ? 'Approving...'
                            : `Approve ${approvalTarget === 'A'
                                ? tokenA?.symbol
                                : tokenB?.symbol
                            }`}
                    </button>
                ) : (
                    <button
                        onClick={handleAddLiquidity}
                        disabled={isConfirming || !amountA || !amountB}
                        className="primary-button"
                    >
                        {isConfirming ? 'Confirming...' : 'Add Liquidity'}
                    </button>
                )}

                {hash && (
                    <div className="text-center text-xs text-gray-400 mt-2">
                        Tx: {hash.slice(0, 6)}...{hash.slice(-4)}
                    </div>
                )}
            </div>
        </div>
    );
}

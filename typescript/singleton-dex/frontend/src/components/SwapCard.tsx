'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, Address, erc20Abi, zeroAddress, formatUnits } from 'viem';
import { SINGLETON_ABI } from '../constants/abi';
import { SINGLETON_ADDRESS } from '../constants/tokens';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTokenList } from '../hooks/useTokenList';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { TokenSelector } from './TokenSelector';

export default function SwapCard() {
    const { address, isConnected } = useAccount();
    const { tokens: dynamicTokens } = useTokenList();

    const displayTokens = dynamicTokens;
    const nativeToken = useMemo(
        () =>
            displayTokens.find(
                (token) => token.address.toLowerCase() === zeroAddress.toLowerCase()
            ),
        [displayTokens]
    );
    const selectableTokens = useMemo(
        () =>
            displayTokens.filter(
                (token) => token.address.toLowerCase() !== zeroAddress.toLowerCase()
            ),
        [displayTokens]
    );

    const [tokenIn, setTokenIn] = useState<any>(nativeToken ?? null);
    const [tokenOut, setTokenOut] = useState<any>(null);
    const [amountIn, setAmountIn] = useState('');
    const [slippage, setSlippage] = useState('0.5');

    const ownerAddress = address as Address | undefined;
    const isNativeToken = (token?: { address: Address }) =>
        token?.address?.toLowerCase() === zeroAddress.toLowerCase();

    useEffect(() => {
        if (nativeToken && !tokenIn) {
            setTokenIn(nativeToken);
        }
        if (!tokenOut && selectableTokens.length > 0) {
            setTokenOut(selectableTokens[0]);
        }
    }, [nativeToken, selectableTokens, tokenIn, tokenOut]);

    const tokenInBalance = useTokenBalance(ownerAddress, tokenIn);
    const tokenOutBalance = useTokenBalance(ownerAddress, tokenOut);

    const nativeIn = true;

    const swapPath = useMemo(() => {
        if (!nativeToken || !tokenOut) return null;
        if (tokenOut.address === nativeToken.address) return null;
        const inAddress = zeroAddress as Address;
        const outAddress = tokenOut.address as Address;
        return [inAddress, outAddress] as [Address, Address];
    }, [nativeToken, tokenOut]);

    const slippageBps = useMemo(() => {
        const parsed = parseFloat(slippage);
        if (Number.isNaN(parsed) || parsed < 0) return 50;
        return Math.min(Math.max(Math.round(parsed * 100), 0), 5000);
    }, [slippage]);

    const reservesEnabled = Boolean(swapPath);

    const { data: reserves } = useReadContract({
        address: SINGLETON_ADDRESS,
        abi: SINGLETON_ABI,
        functionName: 'getReserves',
        args: reservesEnabled ? swapPath ?? undefined : undefined,
        query: {
            enabled: reservesEnabled,
        },
    });

    const formatBalanceDisplay = (value: string) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0) return '0';
        if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, '');
        return num.toPrecision(3);
    };

    const {
        writeContract: writeSingleton,
        data: hash,
        isPending: isConfirming,
    } = useWriteContract();
    const {
        writeContract: writeApproval,
        data: approvalHash,
        isPending: isApprovalPending,
    } = useWriteContract();
    const { isLoading: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const { isLoading: isApprovalConfirmed } = useWaitForTransactionReceipt({
        hash: approvalHash,
    });

    const parsedAmountIn = useMemo(() => {
        if (!amountIn || !tokenIn) return 0n;
        try {
            return parseUnits(amountIn, tokenIn.decimals ?? 18);
        } catch {
            return 0n;
        }
    }, [amountIn, tokenIn]);

    const { hasLiquidity, reserveIn, reserveOut } = useMemo(() => {
        if (!reserves) {
            return {
                hasLiquidity: false,
                reserveIn: 0n,
                reserveOut: 0n,
            };
        }
        const [resIn, resOut] = reserves as [bigint, bigint];
        return {
            hasLiquidity: resIn > 0n && resOut > 0n,
            reserveIn: resIn,
            reserveOut: resOut,
        };
    }, [reserves]);

    const expectedAmountOut = useMemo(() => {
        if (!hasLiquidity || parsedAmountIn === 0n) return 0n;
        const amountInWithFee = parsedAmountIn * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn * 1000n + amountInWithFee;
        if (denominator === 0n) return 0n;
        return numerator / denominator;
    }, [hasLiquidity, parsedAmountIn, reserveIn, reserveOut]);

    const minAmountOut = useMemo(() => {
        if (expectedAmountOut === 0n) return 0n;
        const deduction = (expectedAmountOut * BigInt(slippageBps)) / 10000n;
        if (deduction >= expectedAmountOut) return 0n;
        return expectedAmountOut - deduction;
    }, [expectedAmountOut, slippageBps]);

    const {
        data: allowance = 0n,
        refetch: refetchAllowance,
    } = useReadContract({
        address: tokenIn?.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address ?? zeroAddress, SINGLETON_ADDRESS],
        query: {
            enabled:
                !!address &&
                !!tokenIn &&
                !nativeIn,
        },
    });

    const needsApproval =
        !!address &&
        !!tokenIn &&
        !nativeIn &&
        parsedAmountIn > allowance;

    useEffect(() => {
        if (isApprovalConfirmed) {
            refetchAllowance();
        }
    }, [isApprovalConfirmed, refetchAllowance]);

    const getFunction = () => {
        if (!tokenIn || !tokenOut) return 'swapExactETHForTokens';
        return 'swapExactETHForTokens';
    };

    const handleSwap = async () => {
        if (!amountIn || !isConnected || !tokenIn || !tokenOut || !address || !swapPath) return;

        // Logic for path
        const path = swapPath;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins
        const amountInWei = parsedAmountIn;

        // Args vary by function
        let args: any[] = [];
        const minOutArg = minAmountOut > 0n ? minAmountOut : 0n;
        // amountOutMin, path, to, deadline
        args = [minOutArg, path, address, deadline];

        const value = amountInWei;

        writeSingleton({
            address: SINGLETON_ADDRESS,
            abi: SINGLETON_ABI,
            functionName: getFunction() as any,
            args: args as any,
            value,
        });
    };

    const handleApprove = () => {
        if (!tokenIn || nativeIn || !address || parsedAmountIn === 0n) return;
        writeApproval({
            address: tokenIn.address as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [SINGLETON_ADDRESS, parsedAmountIn],
        });
    };

    const estimatedOutDisplay =
        expectedAmountOut > 0n
            ? `${formatBalanceDisplay(
                formatUnits(expectedAmountOut, tokenOut?.decimals ?? 18)
            )} ${tokenOut?.symbol ?? ''}`
            : '--';

    const minOutputThreshold = useMemo(() => {
        const decimals = tokenOut?.decimals ?? 18;
        if (decimals <= 6) {
            return BigInt(0);
        }
        return BigInt(10) ** BigInt(decimals - 6);
    }, [tokenOut]);

    const minReceivedDisplay =
        minAmountOut > 0n
            ? `${formatBalanceDisplay(
                formatUnits(minAmountOut, tokenOut?.decimals ?? 18)
            )} ${tokenOut?.symbol ?? ''}`
            : '--';

    const showNoLiquidityMessage =
        (!hasLiquidity && !!tokenOut) ||
        (hasLiquidity && tokenOut && (expectedAmountOut === 0n || expectedAmountOut <= minOutputThreshold));

    const swapDisabled =
        isConfirming ||
        !amountIn ||
        !tokenOut ||
        !hasLiquidity ||
        expectedAmountOut === 0n ||
        (minOutputThreshold > 0n && expectedAmountOut <= minOutputThreshold) ||
        parsedAmountIn === 0n;

    return (
        <div className="glass-panel w-full max-w-[480px] p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Swap</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Slippage</span>
                    <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.1}
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-right text-white"
                    />
                    <span>%</span>
                </div>
            </div>

            <div className="space-y-4">
                {/* From Section */}
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400">From</span>
                        <span className="text-sm text-gray-400">
                            Balance: {formatBalanceDisplay(tokenInBalance.formatted)}
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            value={amountIn}
                            onChange={(e) => setAmountIn(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-medium outline-none w-full placeholder-gray-600"
                        />
                        <div className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 font-bold min-w-[120px] justify-center border border-white/10">
                            {nativeToken ? (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-yellow-500" />
                                    {nativeToken.symbol}
                                </>
                            ) : (
                                'BNB'
                            )}
                        </div>
                    </div>
                </div>

                {/* To Section */}
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400">To</span>
                        <span className="text-sm text-gray-400">
                            Balance: {formatBalanceDisplay(tokenOutBalance.formatted)}
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            disabled
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-medium outline-none w-full text-gray-500 cursor-not-allowed"
                        />
                        <TokenSelector
                            tokens={selectableTokens}
                            selected={tokenOut}
                            onSelect={setTokenOut}
                        />
                    </div>
                    <div className="text-sm text-gray-400 mt-2 space-y-1">
                        <div>Estimated output: {estimatedOutDisplay}</div>
                        <div>Minimum received: {minReceivedDisplay}</div>
                        {showNoLiquidityMessage && (
                            <div className="text-[#ffb3b3]">
                                No liquidity available for this pair yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                {!isConnected ? (
                    <div className="w-full">
                        <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                                <button onClick={openConnectModal} className="primary-button">
                                    Connect Wallet
                                </button>
                            )}
                        </ConnectButton.Custom>
                    </div>
                ) : needsApproval ? (
                    <button
                        onClick={handleApprove}
                        disabled={isApprovalPending || parsedAmountIn === 0n}
                        className="primary-button"
                    >
                        {isApprovalPending ? 'Approving...' : `Approve ${tokenIn?.symbol ?? ''}`}
                    </button>
                ) : (
                    <button
                        onClick={handleSwap}
                        disabled={swapDisabled}
                        className="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConfirming
                            ? 'Confirming...'
                            : !tokenOut
                                ? 'Select Token'
                                : hasLiquidity
                                    ? 'Swap'
                                    : 'No Liquidity'}
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

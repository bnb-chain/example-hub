import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { SINGLETON_SWAP_ADDRESS, SINGLETON_SWAP_ABI } from '../constants/contracts';

interface Order {
    id: bigint;
    owner: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    minAmountOut: bigint;
    executed: boolean;
}

const ERC20_ABI = [
    { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export default function LimitOrderCard() {
    const { address } = useAccount();
    const [tokenIn, setTokenIn] = useState('');
    const [tokenOut, setTokenOut] = useState('');
    const [amountIn, setAmountIn] = useState('');
    const [minAmountOut, setMinAmountOut] = useState('');
    const [userOrders, setUserOrders] = useState<number[]>([]);
    const [needsApproval, setNeedsApproval] = useState(false);
    const [pendingTx, setPendingTx] = useState<'approve' | 'place' | null>(null);

    const { writeContractAsync } = useWriteContract();

    // Check allowance for tokenIn
    const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
        address: tokenIn as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && tokenIn && tokenIn !== '0x0000000000000000000000000000000000000000' ? [address, SINGLETON_SWAP_ADDRESS] : undefined,
    });

    // Fetch user orders
    const { data: ordersData, refetch: refetchOrders } = useReadContract({
        address: SINGLETON_SWAP_ADDRESS,
        abi: SINGLETON_SWAP_ABI,
        functionName: 'getUserOrders',
        args: address ? [address] : undefined,
    });

    useEffect(() => {
        if (ordersData) {
            setUserOrders(ordersData as unknown as number[]);
        }
    }, [ordersData]);

    useEffect(() => {
        if (tokenIn === '0x0000000000000000000000000000000000000000' || !tokenIn || !amountIn) {
            setNeedsApproval(false);
            return;
        }

        const amount = parseUnits(amountIn || '0', 18);
        const allowance = (allowanceData as bigint) || 0n;
        const needs = allowance < amount;
        setNeedsApproval(needs);
        console.log(`[LimitOrder] Allowance check: Token=${tokenIn}, Amount=${amount}, Allowance=${allowance}, NeedsApproval=${needs}`);
    }, [allowanceData, amountIn, tokenIn]);

    const handleApprove = async () => {
        if (!tokenIn || tokenIn === '0x0000000000000000000000000000000000000000') return;

        try {
            console.log(`[LimitOrder] Initiating approval for ${tokenIn}...`);
            setPendingTx('approve');
            const hash = await writeContractAsync({
                address: tokenIn as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [SINGLETON_SWAP_ADDRESS, parseUnits('1000000000', 18)], // Approve very large amount
            });
            console.log(`[LimitOrder] Approval Tx sent: ${hash}`);

            // Wait for confirmation here if possible, or rely on useEffect to watch allowance
            // In this simple version, we'll let the UI update via the wagmi hooks
        } catch (error) {
            console.error('[LimitOrder] Approval failed:', error);
            setPendingTx(null);
        }
    };

    // Watch for allowance updates to auto-trigger order placement if intended
    useEffect(() => {
        if (pendingTx === 'approve' && !needsApproval) {
            console.log('[LimitOrder] Approval confirmed and sufficient. Ready to place order.');
            setPendingTx(null);
            // Optional: Auto-trigger place order here if UX desires, 
            // but usually better to let user click to be sure.
            // For now, we just reset the pending state so the button updates.
        }
    }, [needsApproval, pendingTx]);

    const handlePlaceOrder = async () => {
        if (!tokenIn || !tokenOut || !amountIn || !minAmountOut) return;

        try {
            console.log(`[LimitOrder] Placing order: ${amountIn} ${tokenIn} -> ${minAmountOut} ${tokenOut}`);
            setPendingTx('place');

            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

            const hash = await writeContractAsync({
                address: SINGLETON_SWAP_ADDRESS,
                abi: SINGLETON_SWAP_ABI,
                functionName: 'placeOrder',
                args: [
                    tokenIn as `0x${string}`,
                    tokenOut as `0x${string}`,
                    parseUnits(amountIn, 18),
                    parseUnits(minAmountOut, 18),
                    deadline
                ],
                value: tokenIn === '0x0000000000000000000000000000000000000000' ? parseUnits(amountIn, 18) : undefined,
            });

            console.log(`[LimitOrder] Order Tx sent: ${hash}`);
            setPendingTx(null);
            // Optimistic update or wait for refetch
            setTimeout(() => refetchOrders(), 2000);
        } catch (error) {
            console.error('[LimitOrder] Place order failed:', error);
            setPendingTx(null);
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        try {
            console.log(`[LimitOrder] Cancelling order #${orderId}...`);
            const hash = await writeContractAsync({
                address: SINGLETON_SWAP_ADDRESS,
                abi: SINGLETON_SWAP_ABI,
                functionName: 'cancelOrder',
                args: [BigInt(orderId)],
            });
            console.log(`[LimitOrder] Cancel Tx sent: ${hash}`);
        } catch (error) {
            console.error('[LimitOrder] Cancel failed:', error);
        }
    };

    return (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-2">📊 Limit Orders</h2>
            <p className="text-gray-400 text-sm mb-6">Set a target price and get filled automatically</p>

            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Token In Address</label>
                    <input
                        type="text"
                        placeholder="0x... or 0x0000... for BNB"
                        value={tokenIn}
                        onChange={(e) => setTokenIn(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Token Out Address</label>
                    <input
                        type="text"
                        placeholder="0x... or 0x0000... for BNB"
                        value={tokenOut}
                        onChange={(e) => setTokenOut(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Sell</label>
                    <input
                        type="text"
                        placeholder="0.0"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Amount Out (Target Price)</label>
                    <input
                        type="text"
                        placeholder="0.0"
                        value={minAmountOut}
                        onChange={(e) => setMinAmountOut(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0B90B]"
                    />
                </div>

                {needsApproval && tokenIn !== '0x0000000000000000000000000000000000000000' && (
                    <button
                        onClick={handleApprove}
                        disabled={pendingTx === 'approve'}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                        {pendingTx === 'approve' ? 'Approving...' : '1. Approve Token'}
                    </button>
                )}

                <button
                    onClick={handlePlaceOrder}
                    disabled={pendingTx !== null || (needsApproval && tokenIn !== '0x0000000000000000000000000000000000000000') || !tokenIn || !tokenOut || !amountIn || !minAmountOut}
                    className="w-full bg-[#F0B90B] hover:bg-[#d9a309] disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition-all"
                >
                    {pendingTx === 'place' ? 'Confirming...' : needsApproval ? 'Waiting for Approval...' : 'Place Limit Order'}
                </button>
            </div>

            <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-bold text-white mb-4">Your Orders</h3>
                {userOrders.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No active orders</p>
                ) : (
                    <div className="space-y-3">
                        {userOrders.map((orderId) => (
                            <OrderItem
                                key={orderId}
                                orderId={orderId}
                                onCancel={(id) => handleCancelOrder(id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function OrderItem({ orderId, onCancel }: { orderId: number; onCancel: (id: number) => void }) {
    const { data: orderData } = useReadContract({
        address: SINGLETON_SWAP_ADDRESS,
        abi: SINGLETON_SWAP_ABI,
        functionName: 'orders',
        args: [BigInt(orderId)],
    });

    if (!orderData) return null;

    const order = orderData as any;

    return (
        <div className={`bg-white/5 border ${order[6] ? 'border-green-500/20' : 'border-white/10'} rounded-lg p-4`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-400">Order #{orderId.toString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${order[6] ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {order[6] ? '✓ Executed' : '⏳ Pending'}
                </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
                <span>{formatUnits(order[4], 18)}</span>
                <span className="text-gray-500">→</span>
                <span>{formatUnits(order[5], 18)}</span>
            </div>
            {!order[6] && (
                <button
                    onClick={() => onCancel(orderId)}
                    className="mt-3 w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium py-2 px-4 rounded-lg transition-all text-sm"
                >
                    Cancel Order
                </button>
            )}
        </div>
    );
}

export const SINGLETON_SWAP_ADDRESS = '0x2a238B4220CaE39a5A5c09697b2467164bC0242B' as const;

export const SINGLETON_SWAP_ABI = [
    // View functions
    { type: 'function', name: 'getUserOrders', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view' },
    { type: 'function', name: 'orders', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'id', type: 'uint256' }, { name: 'owner', type: 'address' }, { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'minAmountOut', type: 'uint256' }, { name: 'executed', type: 'bool' }], stateMutability: 'view' },
    { type: 'function', name: 'nextOrderId', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'getReserves', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }], outputs: [{ name: 'reserveA', type: 'uint256' }, { name: 'reserveB', type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'delta', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'int256' }], stateMutability: 'view' },

    // Limit Order functions
    { type: 'function', name: 'placeOrder', inputs: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'minAmountOut', type: 'uint256' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'orderId', type: 'uint256' }], stateMutability: 'payable' },
    { type: 'function', name: 'cancelOrder', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'executeOrder', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },

    // Events
    { type: 'event', name: 'OrderPlaced', inputs: [{ name: 'orderId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'tokenIn', type: 'address', indexed: false }, { name: 'tokenOut', type: 'address', indexed: false }, { name: 'amountIn', type: 'uint256', indexed: false }, { name: 'minAmountOut', type: 'uint256', indexed: false }], anonymous: false },
    { type: 'event', name: 'OrderCanceled', inputs: [{ name: 'orderId', type: 'uint256', indexed: true }], anonymous: false },
    { type: 'event', name: 'OrderExecuted', inputs: [{ name: 'orderId', type: 'uint256', indexed: true }, { name: 'executor', type: 'address', indexed: true }, { name: 'amountOut', type: 'uint256', indexed: false }], anonymous: false },

    // Swap functions
    { type: 'function', name: 'swapExactTokensForTokens', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'swapExactETHForTokens', inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }], stateMutability: 'payable' },
    { type: 'function', name: 'swapExactTokensForETH', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }], stateMutability: 'nonpayable' },

    // Liquidity functions
    { type: 'function', name: 'addLiquidity', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'amountADesired', type: 'uint256' }, { name: 'amountBDesired', type: 'uint256' }, { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }, { name: 'liquidity', type: 'uint256' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'addLiquidityETH', inputs: [{ name: 'token', type: 'address' }, { name: 'amountTokenDesired', type: 'uint256' }, { name: 'amountTokenMin', type: 'uint256' }, { name: 'amountETHMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountToken', type: 'uint256' }, { name: 'amountETH', type: 'uint256' }, { name: 'liquidity', type: 'uint256' }], stateMutability: 'payable' },
    { type: 'function', name: 'removeLiquidity', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'liquidity', type: 'uint256' }, { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'removeLiquidityETH', inputs: [{ name: 'token', type: 'address' }, { name: 'liquidity', type: 'uint256' }, { name: 'amountTokenMin', type: 'uint256' }, { name: 'amountETHMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountToken', type: 'uint256' }, { name: 'amountETH', type: 'uint256' }], stateMutability: 'nonpayable' },
] as const;

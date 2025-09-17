// amm.ts
// Minimal constant-product AMM (x * y = k) with slippage protection.

export type Token = "tBNB" | "BUSD";

export interface Pool {
  token0: Token; // e.g., tBNB
  token1: Token; // e.g., BUSD
  reserve0: number; // reserves for token0
  reserve1: number; // reserves for token1
  feeBps: number; // fee in basis points (e.g., 25 = 0.25%)
}

export interface SwapResult {
  amountIn: number;
  amountOut: number;
  priceImpactPct: number;
  newReserve0: number;
  newReserve1: number;
}

export function assertPositive(n: number, msg: string) {
  if (!(Number.isFinite(n) && n > 0)) throw new Error(msg);
}

/**
 * Simulate swap tokenIn -> tokenOut using x*y=k with fee.
 * Returns the output amount, price impact, and new reserves (post-swap).
 */
export function swap(pool: Pool, tokenIn: Token, amountIn: number): SwapResult {
  assertPositive(amountIn, "amountIn must be > 0");

  const is0In = tokenIn === pool.token0;
  let x = pool.reserve0;
  let y = pool.reserve1;

  // Apply fee on input
  const fee = pool.feeBps / 10_000; // 25 bps -> 0.0025
  const amountInAfterFee = amountIn * (1 - fee);

  // Invariant: (x + dx) * (y - dy) = k  =>  dy = (y * dx) / (x + dx)
  const dx = is0In ? amountInAfterFee : 0;
  const dy = is0In ? (y * dx) / (x + dx) : 0;

  const dx1 = !is0In ? amountInAfterFee : 0;
  const dy1 = !is0In ? (x * dx1) / (y + dx1) : 0;

  const amountOut = is0In ? dy : dy1;

  // Update reserves after swap
  const newX = is0In ? x + amountInAfterFee : x - amountOut;
  const newY = is0In ? y - amountOut : y + amountInAfterFee;

  // Price impact approximation: compare pre/post mid-price
  const priceBefore = y / x; // token1 per token0
  const priceAfter = newY / newX;
  const priceImpactPct =
    Math.abs((priceAfter - priceBefore) / priceBefore) * 100;

  return {
    amountIn,
    amountOut,
    priceImpactPct,
    newReserve0: newX,
    newReserve1: newY,
  };
}

/**
 * Helper to enforce minimum received (slippage check).
 */
export function enforceMinOut(actual: number, minOut: number) {
  if (actual < minOut) {
    throw new Error(
      `Slippage too high: received ${actual.toFixed(6)} < minOut ${minOut.toFixed(6)}`,
    );
  }
}

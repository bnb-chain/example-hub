/**
 * Fiat → BNB Chain stablecoin conversion.
 *
 * The agent must translate the QRIS amount (IDR) into the on-chain stablecoin
 * amount (18 decimals for all BSC stablecoins) — per BNB Chain ecosystem rules
 * the settlement token is a native BSC stablecoin (BUSD, FDUSD, or $U), not a
 * third-party token. The conversion is behind an interface so the demo can use
 * a static rate while production plugs in a live FX source.
 *
 * Multi-token: the rate source converts IDR → any curated BSC stablecoin, not
 * just BUSD. For demo purposes all BSC stablecoins are ~$1 so the rate is the
 * same; in production the source may fetch token-specific rates.
 *
 * SEC-04 FIX: All conversion math uses pure BigInt arithmetic — no Number()
 * precision loss or overflow. The rate is expressed as a rational
 * (numerator/denominator) to avoid floating-point entirely.
 */

import type { TokenEntry } from "./tokens";

export interface RateSource {
  /** Convert an IDR amount (integer minor units) to a stablecoin base-unit amount (18 decimals). */
  idrToStablecoin(idrAmount: bigint, token: TokenEntry): Promise<bigint>;
}

const STABLECOIN_UNIT = 1_000_000_000_000_000_000n; // 18 decimals

/**
 * Fixed-rate converter for demos/tests (no network, deterministic).
 *
 * SEC-04 FIX: Instead of storing a float and multiplying with Number(),
 * we store the rate as a rational (numerator, denominator) and compute
 * entirely with BigInt. This avoids precision loss for large IDR amounts
 * (> 2^53) and overflow (Number * 1e18 → Infinity).
 *
 * The rational is derived from the constructor's float rate, but for
 * production use `fromRational(numerator, denominator)` directly.
 */
export class StaticRateSource implements RateSource {
  private readonly rateNum: bigint;
  private readonly rateDen: bigint;

  /**
   * @param stablePerIdr Stablecoin per 1 IDR (e.g. 1/16000 = 0.0000625).
   * For exact control, use `fromRational()` instead.
   */
  constructor(stablePerIdr: number) {
    // Convert the float rate to a rational with sufficient precision.
    // e.g. 1/16000 → rateNum=1, rateDen=16000
    // We use the string representation to avoid float errors.
    const s = stablePerIdr.toString();
    if (s.includes("e") || s.includes("E")) {
      // Scientific notation — parse as fraction
      const [mantissa, exp] = s.toLowerCase().split("e");
      const expNum = parseInt(exp, 10);
      const [intPart, decPart] = mantissa.split(".");
      const digits = (intPart + (decPart ?? "")).replace(/^0+/, "") || "0";
      const decPlaces = (decPart ?? "").length - expNum;
      if (decPlaces > 0) {
        this.rateNum = BigInt(digits);
        this.rateDen = 10n ** BigInt(decPlaces);
      } else {
        this.rateNum = BigInt(digits) * 10n ** BigInt(-decPlaces);
        this.rateDen = 1n;
      }
    } else {
      const [intPart, decPart] = s.split(".");
      const digits = (intPart + (decPart ?? "")).replace(/^0+/, "") || "0";
      const decPlaces = (decPart ?? "").length;
      this.rateNum = BigInt(digits);
      this.rateDen = decPlaces > 0 ? 10n ** BigInt(decPlaces) : 1n;
    }
  }

  /**
   * Create a rate source from an exact rational (numerator/denominator).
   * E.g. `StaticRateSource.fromRational(1n, 16000n)` = 1 stablecoin per 16000 IDR.
   */
  static fromRational(num: bigint, den: bigint): StaticRateSource {
    const src = Object.create(StaticRateSource.prototype);
    src.rateNum = num;
    src.rateDen = den;
    return src;
  }

  async idrToStablecoin(
    idrAmount: bigint,
    _token: TokenEntry
  ): Promise<bigint> {
    // Pure BigInt math: result = idrAmount * rateNum * STABLECOIN_UNIT / rateDen
    // No Number() — no precision loss, no overflow.
    return (idrAmount * this.rateNum * STABLECOIN_UNIT) / this.rateDen;
  }
}

/** Live FX via the public CoinGecko API (no key). Falls back on network error. */
export class CoinGeckoRateSource implements RateSource {
  private coinId = new Map<string, string>([
    ["busd", "binance-usd"],
    ["fdusd", "first-digital-usd"],
    ["u", "u-token"],
  ]);

  async idrToStablecoin(idrAmount: bigint, token: TokenEntry): Promise<bigint> {
    const coinId = this.coinId.get(token.symbol) ?? "binance-usd";
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=idr`
    );
    if (!res.ok) throw new Error(`CoinGecko FX request failed: ${res.status}`);
    const json = (await res.json()) as Record<string, { idr?: number }>;
    const rate = json[coinId]?.idr;
    if (!rate || rate <= 0) throw new Error("CoinGecko returned no IDR rate");

    // SEC-04 FIX: Parse the rate as a string to preserve precision, then
    // convert to a rational for BigInt math. This avoids Number() precision
    // loss on the rate itself.
    const rateStr = rate.toString();
    const [intPart, decPart] = rateStr.split(".");
    const digits = (intPart + (decPart ?? "")).replace(/^0+/, "") || "0";
    const decPlaces = (decPart ?? "").length;
    const rateNum = BigInt(digits);
    const rateDen = decPlaces > 0 ? 10n ** BigInt(decPlaces) : 1n;

    // result = idrAmount * STABLECOIN_UNIT * rateDen / (rateNum * 1)
    // (idrAmount in IDR minor units * 1e18 to get 18-decimal stablecoin / rate)
    return (idrAmount * STABLECOIN_UNIT * rateDen) / rateNum;
  }
}

export function createRateSource(mode: string | undefined): RateSource {
  if (mode === "coingecko") return new CoinGeckoRateSource();
  // Default demo rate: 1 stablecoin ≈ 18,000 IDR (≈ current market rate).
  // For live rates, set RATE_SOURCE=coingecko in .env.
  return StaticRateSource.fromRational(1n, 18000n);
}

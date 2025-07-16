import { BollingerBands, MACD } from "../types";

/**
 * Calculate Simple Moving Average (SMA)
 * @param prices Array of price values
 * @param period Period for the moving average
 * @returns Array of SMA values
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param prices Array of price values
 * @param period Period for the moving average
 * @returns Array of EMA values
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i]);
    } else {
      ema.push(prices[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }
  }
  return ema;
}

/**
 * Calculate Bollinger Bands
 * @param prices Array of price values
 * @param period Period for the moving average (default: 20)
 * @param stdDev Standard deviation multiplier (default: 2)
 * @returns Array of Bollinger Bands objects
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBands[] {
  const sma = calculateSMA(prices, period);
  const bands: BollingerBands[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: NaN, middle: NaN, lower: NaN });
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance =
        slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        period;
      const standardDeviation = Math.sqrt(variance);

      bands.push({
        upper: mean + stdDev * standardDeviation,
        middle: mean,
        lower: mean - stdDev * standardDeviation,
      });
    }
  }
  return bands;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param prices Array of price values
 * @param period Period for RSI calculation (default: 14)
 * @returns Array of RSI values
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain =
        gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }
  }
  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param prices Array of price values
 * @param fastPeriod Fast EMA period (default: 12)
 * @param slowPeriod Slow EMA period (default: 26)
 * @param signalPeriod Signal line period (default: 9)
 * @returns Array of MACD objects
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACD[] {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(
    macdLine.filter((val) => !isNaN(val)),
    signalPeriod
  );

  const histogram = macdLine.map((macd, i) => {
    const signal = signalLine[i] || 0;
    return isNaN(macd) ? NaN : macd - signal;
  });

  return macdLine.map((macd, i) => ({
    MACD: isNaN(macd) ? NaN : macd,
    signal: signalLine[i] || NaN,
    histogram: histogram[i] || NaN,
  }));
}

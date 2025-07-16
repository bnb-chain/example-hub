import axios from "axios";
import { OHLCV } from "../types";

/**
 * Fetch OHLCV data from CoinGecko API
 * @param tokenSymbol The token symbol to fetch data for
 * @param days Number of days of data to fetch (default: 30)
 * @returns Promise<OHLCV[]> Array of OHLCV data points
 */
export async function fetchOHLCVFromCoinGecko(
  tokenSymbol: string,
  days: number = 30
): Promise<OHLCV[]> {
  // Map token symbol to CoinGecko id
  const symbolToId: Record<string, string> = {
    BNB: "binancecoin",
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    TRX: "tron",
  };

  const id = symbolToId[tokenSymbol.toUpperCase()];
  if (!id) {
    throw new Error(
      `Token symbol ${tokenSymbol} not supported. Supported tokens: ${Object.keys(
        symbolToId
      ).join(", ")}`
    );
  }

  const url = `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
  const volumeUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const [ohlcRes, volumeRes] = await Promise.all([
      axios.get(url),
      axios.get(volumeUrl),
    ]);

    // Check if responses are successful
    if (ohlcRes.status !== 200 || volumeRes.status !== 200) {
      throw new Error(
        `API request failed: OHLC status ${ohlcRes.status}, Volume status ${volumeRes.status}`
      );
    }

    // ohlc: [timestamp, open, high, low, close]
    const ohlcArr = ohlcRes.data as Array<
      [number, number, number, number, number]
    >;
    // volume: { total_volumes: [[timestamp, volume], ...] }
    const volumeArr: Array<[number, number]> = volumeRes.data.total_volumes;
    const volumeMap = new Map(volumeArr.map(([t, v]) => [t, v]));

    return ohlcArr.map(([time, open, high, low, close]) => ({
      time,
      open,
      high,
      low,
      close,
      volume: volumeMap.get(time) || 0,
    }));
  } catch (error) {
    console.error("Error fetching data from CoinGecko:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `CoinGecko API error: ${error.response?.status} - ${error.response?.statusText}`
      );
    }
    throw error;
  }
}

/**
 * Get supported token symbols
 * @returns Array of supported token symbols
 */
export function getSupportedTokens(): string[] {
  return ["BNB", "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "TRX"];
}

/**
 * Check if a token symbol is supported
 * @param tokenSymbol The token symbol to check
 * @returns boolean True if supported, false otherwise
 */
export function isTokenSupported(tokenSymbol: string): boolean {
  const supportedTokens = getSupportedTokens();
  return supportedTokens.includes(tokenSymbol.toUpperCase());
}

/**
 * Fetch current price for a token from CoinGecko API
 * @param tokenSymbol The token symbol to fetch price for
 * @returns Promise<number> Current price in USD
 */
export async function fetchCurrentPrice(tokenSymbol: string): Promise<number> {
  // Map token symbol to CoinGecko id
  const symbolToId: Record<string, string> = {
    BNB: "binancecoin",
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    TRX: "tron",
  };

  const id = symbolToId[tokenSymbol.toUpperCase()];
  if (!id) {
    throw new Error(
      `Token symbol ${tokenSymbol} not supported. Supported tokens: ${Object.keys(
        symbolToId
      ).join(", ")}`
    );
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;

  try {
    const response = await axios.get(url);

    if (response.status !== 200) {
      throw new Error(`API request failed: status ${response.status}`);
    }

    const data = response.data;
    const price = data[id]?.usd;

    if (!price) {
      throw new Error(`Price not found for ${tokenSymbol}`);
    }

    return price;
  } catch (error) {
    console.error("Error fetching current price from CoinGecko:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `CoinGecko API error: ${error.response?.status} - ${error.response?.statusText}`
      );
    }
    throw error;
  }
}

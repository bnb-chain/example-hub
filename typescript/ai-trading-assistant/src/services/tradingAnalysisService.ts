import { OHLCV } from "../types";
import {
  fetchOHLCVFromCoinGecko,
  getSupportedTokens,
} from "./coinGeckoService";
import {
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
} from "../utils/technicalAnalysis";
import { generateAnalysisData } from "./analysisService";

/**
 * Perform complete trading analysis for a cryptocurrency token
 * @param token The token symbol to analyze
 * @returns Promise<string> Formatted analysis text
 */
export async function performAnalysis(token: string): Promise<string> {
  try {
    // Validate token
    const supportedTokens = getSupportedTokens();
    if (!supportedTokens.includes(token.toUpperCase())) {
      return `Error: Token ${token} is not supported. Supported tokens: ${supportedTokens.join(
        ", "
      )}`;
    }

    // Fetch market data
    console.log(
      `📡 Fetching ${token.toUpperCase()} market data from CoinGecko...`
    );
    const ohlcvData: OHLCV[] = await fetchOHLCVFromCoinGecko(token);
    const closes = ohlcvData.map((candle) => candle.close);
    console.log(`✅ Received ${ohlcvData.length} data points`);

    // Calculate technical indicators
    console.log(`📊 Calculating technical indicators...`);
    const bb = calculateBollingerBands(closes);
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    console.log(`✅ Technical analysis complete`);

    // Generate analysis text
    console.log(`🤖 Generating AI analysis...`);
    const analysis = await generateAnalysisData(token, closes, bb, rsi, macd);
    console.log(`✅ Analysis generated successfully`);
    console.log("📊 Trading Signal JSON:", analysis.json);

    let result = `📊 ${token.toUpperCase()} ANALYSIS 📊\n\n${analysis.text}`;

    // Check if this is BNB with a long position and add trading prompt
    if (token.toUpperCase() === "BNB" && analysis.json?.position === "long") {
      result += `\n\n💡 **Trading Opportunity Detected!** 💡\n`;
      result += `Would you like to trade BNB with 10 USDT?\n`;
      result += `Entry: $${analysis.json.entry} | Target: $${analysis.json.target} | Stop Loss: $${analysis.json.stopLoss}\n`;
      result += `You can check the current price by typing: "what is the current price for BNB"\n`;
      result += `This will help you make an informed decision about the trade.`;
    }

    return result;
  } catch (error) {
    return `Error performing analysis for ${token}: ${error}`;
  }
}

/**
 * Get analysis tool definition for OpenAI function calling
 * @returns Tool definition object
 */
export function getAnalysisToolDefinition() {
  return {
    type: "function" as const,
    function: {
      name: "performAnalysis",
      description:
        "Perform technical analysis on a cryptocurrency token using real market data from CoinGecko. Supports BNB, BTC, ETH, SOL, XRP, ADA, DOGE, TRX.",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "The token symbol to analyze (e.g., BNB, BTC, ETH)",
            enum: getSupportedTokens(),
          },
        },
        required: ["token"],
      },
    },
  };
}

import { fetchCurrentPrice, getSupportedTokens } from "./coinGeckoService";

/**
 * Get current price for a token
 * @param token The token symbol to get price for
 * @returns Promise<string> Formatted price information
 */
export async function getCurrentPrice(token: string): Promise<string> {
  try {
    // Validate token
    const supportedTokens = getSupportedTokens();
    if (!supportedTokens.includes(token.toUpperCase())) {
      return `Error: Token ${token} is not supported. Supported tokens: ${supportedTokens.join(
        ", "
      )}`;
    }

    // Fetch current price
    console.log(`📡 Fetching current price for ${token.toUpperCase()}...`);
    const price = await fetchCurrentPrice(token);
    console.log(`✅ Current price fetched: $${price}`);

    return `💰 Current ${token.toUpperCase()} Price: $${price.toFixed(2)} USD`;
  } catch (error) {
    return `Error fetching current price for ${token}: ${error}`;
  }
}

/**
 * Get current price tool definition for OpenAI function calling
 * @returns Tool definition object
 */
export function getCurrentPriceToolDefinition() {
  return {
    type: "function" as const,
    function: {
      name: "getCurrentPrice",
      description:
        "Get the current price of a cryptocurrency token from CoinGecko. Supports BNB, BTC, ETH, SOL, XRP, ADA, DOGE, TRX.",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              "The token symbol to get price for (e.g., BNB, BTC, ETH)",
            enum: getSupportedTokens(),
          },
        },
        required: ["token"],
      },
    },
  };
}

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { executeUSDTToBNBSwap } from "./swapService";
import { fetchCurrentPrice } from "./coinGeckoService";
import "dotenv/config";

// USDT token address on BNB Chain
const USDT_TOKEN_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const REQUIRED_USDT_AMOUNT = 10;

/**
 * Get user's wallet address using MCP get_address_from_private_key tool
 * @param mcpClient The MCP client instance
 * @returns Promise<string> User's wallet address
 */
export async function getUserAddress(mcpClient: Client): Promise<string> {
  try {
    console.log("🔍 Getting user's wallet address...");

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not found in environment variables");
    }

    const result = await mcpClient.callTool({
      name: "get_address_from_private_key",
      arguments: {
        private_key: privateKey,
      },
    });

    if (!result.content) {
      throw new Error("No address data received");
    }

    // Handle the response - MCP returns an array with text objects
    let addressData;
    if (Array.isArray(result.content)) {
      // Extract the text from the first text object
      const textContent = result.content.find(
        (item) => item.type === "text"
      )?.text;
      if (!textContent) {
        throw new Error("No text content found in response");
      }
      addressData = JSON.parse(textContent);
    } else if (typeof result.content === "string") {
      addressData = JSON.parse(result.content);
    } else {
      addressData = result.content;
    }

    const address = addressData.address;

    if (!address) {
      throw new Error("No address found in response");
    }

    console.log(`✅ User address: ${address}`);
    return address;
  } catch (error) {
    console.error("Error getting user address:", error);
    throw error;
  }
}

/**
 * Check USDT balance using MCP get_erc20_balance tool
 * @param mcpClient The MCP client instance
 * @returns Promise<number> USDT balance
 */
export async function checkUSDTBalance(mcpClient: Client): Promise<number> {
  try {
    console.log("🔍 Checking USDT balance...");

    // First get the user's address
    const userAddress = await getUserAddress(mcpClient);

    const result = await mcpClient.callTool({
      name: "get_erc20_balance",
      arguments: {
        tokenAddress: USDT_TOKEN_ADDRESS,
        address: userAddress,
      },
    });

    if (!result.content) {
      throw new Error("No balance data received");
    }

    // Handle the response - MCP returns an array with text objects
    let balanceData;
    if (Array.isArray(result.content)) {
      // Extract the text from the first text object
      const textContent = result.content.find(
        (item) => item.type === "text"
      )?.text;
      if (!textContent) {
        throw new Error("No text content found in response");
      }
      balanceData = JSON.parse(textContent);
    } else if (typeof result.content === "string") {
      balanceData = JSON.parse(result.content);
    } else {
      balanceData = result.content;
    }

    const balance = parseFloat(
      balanceData.formatted || balanceData.balance || "0"
    );

    console.log(`✅ USDT Balance: ${balance}`);
    return balance;
  } catch (error) {
    console.error("Error checking USDT balance:", error);
    throw error;
  }
}

/**
 * Check if user has sufficient USDT balance for trading
 * @param mcpClient The MCP client instance
 * @returns Promise<{hasSufficientBalance: boolean, balance: number, message: string}>
 */
export async function checkTradingEligibility(mcpClient: Client): Promise<{
  hasSufficientBalance: boolean;
  balance: number;
  message: string;
}> {
  try {
    const balance = await checkUSDTBalance(mcpClient);

    if (balance >= REQUIRED_USDT_AMOUNT) {
      return {
        hasSufficientBalance: true,
        balance,
        message: `✅ You have sufficient USDT balance: ${balance.toFixed(
          2
        )} USDT. You can proceed with the trade!`,
      };
    } else {
      return {
        hasSufficientBalance: false,
        balance,
        message: `❌ Insufficient USDT balance. You have ${balance.toFixed(
          2
        )} USDT, but need at least ${REQUIRED_USDT_AMOUNT} USDT. Please reload your account.`,
      };
    }
  } catch (error) {
    return {
      hasSufficientBalance: false,
      balance: 0,
      message: `Error checking balance: ${error}`,
    };
  }
}

/**
 * Execute trade with USDT balance check
 * @param mcpClient The MCP client instance
 * @param tokenSymbol The token to trade
 * @param amount The amount in USDT to trade with
 * @returns Promise<string> Trade result message
 */
export async function executeTrade(
  mcpClient: Client,
  tokenSymbol: string,
  amount: number = REQUIRED_USDT_AMOUNT
): Promise<string> {
  try {
    // First check balance
    const eligibility = await checkTradingEligibility(mcpClient);

    if (!eligibility.hasSufficientBalance) {
      return eligibility.message;
    }

    // If balance is sufficient, proceed with trade
    console.log(
      `🚀 Executing trade for ${amount} USDT worth of ${tokenSymbol}...`
    );

    // Get user's wallet address
    const userAddress = await getUserAddress(mcpClient);

    // For BNB trades, perform the actual swap
    if (tokenSymbol.toUpperCase() === "BNB") {
      try {
        // Get current BNB price
        console.log("📊 Fetching current BNB price for swap calculation...");
        const bnbPrice = await fetchCurrentPrice("BNB");

        // Execute the swap
        const receipt = await executeUSDTToBNBSwap(userAddress, bnbPrice);

        return `✅ Trade executed successfully! You swapped ${amount} USDT for BNB.\n📝 Transaction hash: ${
          receipt.transactionHash
        }\n💰 Your new USDT balance: ${(eligibility.balance - amount).toFixed(
          2
        )} USDT`;
      } catch (swapError) {
        return `❌ Swap failed: ${swapError}. Please try again or check your network connection.`;
      }
    } else {
      // For other tokens, return a placeholder message
      return `✅ Trade simulation completed for ${tokenSymbol}! You would trade ${amount} USDT for ${tokenSymbol}. Your new USDT balance: ${(
        eligibility.balance - amount
      ).toFixed(2)} USDT`;
    }
  } catch (error) {
    return `❌ Trade failed: ${error}`;
  }
}

/**
 * Get trading tool definition for OpenAI function calling
 * @returns Tool definition object
 */
export function getTradingToolDefinition() {
  return {
    type: "function" as const,
    function: {
      name: "executeTrade",
      description:
        "Execute a trade with USDT balance check. Checks if user has sufficient USDT balance before proceeding.",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "The token symbol to trade (e.g., BNB, BTC, ETH)",
            enum: ["BNB", "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "TRX"],
          },
          amount: {
            type: "number",
            description: "Amount in USDT to trade with (default: 10)",
            default: 10,
          },
        },
        required: ["token"],
      },
    },
  };
}

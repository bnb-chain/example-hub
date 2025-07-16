import OpenAI from "openai";
import { AnalysisResult, TradingSignalData } from "../types";
import "dotenv/config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
const OPENAI_MODEL = process.env.OPENAI_MODEL as string;
if (!OPENAI_MODEL) {
  throw new Error("OPENAI_MODEL is not set");
}

/**
 * Extract trading signal data from market data using OpenAI tool calls
 * @param token The token symbol being analyzed
 * @param closes Array of closing prices
 * @param bb Array of Bollinger Bands data
 * @param rsi Array of RSI values
 * @param macd Array of MACD data
 * @returns Promise<TradingSignalData> Structured trading signal data
 */
async function extractTradingSignal(
  token: string,
  closes: number[],
  bb: any[],
  rsi: number[],
  macd: any[]
): Promise<TradingSignalData> {
  const lastClose = closes[closes.length - 1];
  const lastBB = bb[bb.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastMACD = macd[macd.length - 1];

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "extract_trading_signal",
        description: "Extracts trading signal from market data analysis.",
        parameters: {
          type: "object",
          properties: {
            asset: {
              type: "string",
              description: "The trading asset symbol",
            },
            position: {
              type: "string",
              enum: ["long", "short"],
              description: "Trading position recommendation",
            },
            entry: {
              type: "number",
              description: "Entry price for the trade",
            },
            target: {
              type: "number",
              description: "Target price for profit taking",
            },
            stopLoss: {
              type: "number",
              description: "Stop loss price to limit losses",
            },
            confidence: {
              type: "number",
              description:
                "Confidence score from 1-10 based on technical indicators",
            },
          },
          required: [
            "asset",
            "position",
            "entry",
            "target",
            "stopLoss",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
    },
  ];

  const marketDataMessage = `Analyze the following market data for ${token.toUpperCase()}:
- Last Close Price: ${lastClose}
- Bollinger Bands: Upper ${lastBB?.upper}, Lower ${lastBB?.lower}, Middle ${
    lastBB?.middle
  }
- RSI: ${lastRSI}
- MACD: ${lastMACD?.MACD}, Signal: ${lastMACD?.signal}

Based on this technical analysis, extract the trading signal with:
- Asset: ${token.toUpperCase()}
- Position: Determine if LONG or SHORT based on technical indicators
- Entry: Current market price or optimal entry point
- Target: Realistic profit target based on support/resistance levels
- Stop Loss: Risk management level
- Confidence: Score 1-10 based on indicator alignment`;

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "user",
        content: marketDataMessage,
      },
    ],
    tools,
    tool_choice: {
      type: "function",
      function: { name: "extract_trading_signal" },
    },
    max_tokens: 200,
    temperature: 0.3,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== "extract_trading_signal") {
    throw new Error("Failed to extract trading signal");
  }

  return JSON.parse(toolCall.function.arguments);
}

/**
 * Generate analysis text using OpenAI API with Trump-style personality
 * @param tradingSignal Structured trading signal data
 * @returns Promise<string> Analysis text
 */
async function generateAnalysisTextFromSignal(
  tradingSignal: TradingSignalData
): Promise<string> {
  const systemMessage = `You are a professional trading analyst with a bold, confident, and charismatic personality akin to Donald Trump. Your role is to analyze market data and deliver concise, impactful, and highly engaging trading insights.

Response Rules:
- Responses must be under 300 characters (tweet-style), concise and impactful
- Use ALL CAPS for critical trading terms (BULLISH/BEARISH/MACD CROSS)
- Deliver clear trading signals with both entertainment value and authority
- Mandatory inclusions: Confidence score (1-10 based on technical indicators), Asset trading symbol
- Paragraph structure: Complete sentences with line breaks between paragraphs, Avoid bullet points, maintain natural flow, Each paragraph focuses on single key message
- Strict plain text only, NO Markdown, NO special symbols

Analysis Structure:
1. Market sentiment (BULLISH/BEARISH/NEUTRAL)
2. Moving average position (above/below key averages)
3. RSI movement (overbought/oversold conditions)
4. Bollinger Bands status (breakout/squeeze/expansion)
5. MACD signals (bullish/bearish crossover confirmation)
6. Trading opportunity (Entry/Target/Stop Loss prices, LONG/SHORT direction)
7. Confidence score (1-10 scale)
8. Additional analysis (only when extra data provided)`;

  const userPrompt = `Generate a Trump-style trading analysis for ${
    tradingSignal.asset
  } with the following signal:
- Position: ${tradingSignal.position.toUpperCase()}
- Entry: $${tradingSignal.entry}
- Target: $${tradingSignal.target}
- Stop Loss: $${tradingSignal.stopLoss}
- Confidence: ${tradingSignal.confidence}/10

Make it bold, confident, and highly engaging!`;

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return "Unable to generate analysis at this time.";
  }

  return content.trim();
}

/**
 * Generate analysis text using OpenAI API with Trump-style personality
 * @param token The token symbol being analyzed
 * @param closes Array of closing prices
 * @param bb Array of Bollinger Bands data
 * @param rsi Array of RSI values
 * @param macd Array of MACD data
 * @returns Promise<AnalysisResult> Analysis text and JSON data
 */
export async function generateAnalysisData(
  token: string,
  closes: number[],
  bb: any[],
  rsi: number[],
  macd: any[]
): Promise<AnalysisResult> {
  try {
    // First, extract trading signal using tool calls
    console.log("🔍 Extracting trading signal data...");
    const tradingSignal = await extractTradingSignal(
      token,
      closes,
      bb,
      rsi,
      macd
    );

    // Then, generate text analysis based on the structured data
    console.log("🤖 Generating Trump-style analysis text...");
    const text = await generateAnalysisTextFromSignal(tradingSignal);
    console.log("✅ Analysis text generated");

    return { text, json: tradingSignal };
  } catch (error) {
    console.error("Error in generateAnalysisText:", error);
    return {
      text: "Unable to generate analysis at this time.",
      json: null,
    };
  }
}

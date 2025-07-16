import readline from "readline/promises";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import "dotenv/config";

// Import services and utilities
import {
  performAnalysis,
  getAnalysisToolDefinition,
  getCurrentPrice,
  getCurrentPriceToolDefinition,
  executeTrade,
  getTradingToolDefinition,
} from "./services";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const model = "gpt-4o-mini";

export class MCPClient {
  private mcp: Client;
  private openai: OpenAI;
  private transport: StdioClientTransport | null = null;
  private tools: ChatCompletionTool[] = [];
  private conversationHistory: ChatCompletionMessageParam[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

    // Initialize conversation with system message
    this.conversationHistory = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant specialized in trading analysis and blockchain operations. You have access to tools for performing technical analysis on cryptocurrencies and blockchain operations. You can also execute trades with USDT balance checks. When users want to trade, use the executeTrade tool which will automatically check their USDT balance first. Maintain context from previous conversations and provide detailed, helpful responses. When users ask follow-up questions, reference previous analysis results when relevant.",
      },
    ];
  }

  private fixJsonSchema(schema: any): any {
    if (typeof schema !== "object" || schema === null) {
      return schema;
    }

    // Handle arrays - ensure they have 'items' field
    if (schema.type === "array" && !schema.items) {
      schema.items = { type: "string" }; // Default to string array
    }

    // Recursively fix nested objects and arrays
    if (schema.properties) {
      for (const key in schema.properties) {
        schema.properties[key] = this.fixJsonSchema(schema.properties[key]);
      }
    }

    if (schema.items) {
      schema.items = this.fixJsonSchema(schema.items);
    }

    // Ensure required fields for object types
    if (schema.type === "object" && !schema.properties) {
      schema.properties = {};
    }

    return schema;
  }

  async connectToServer() {
    try {
      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: ["node_modules/@bnb-chain/mcp/dist/index.js"],
        env: {
          PRIVATE_KEY,
        },
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      const serverTools = toolsResult.tools.map((tool) => {
        let parameters = tool.inputSchema;
        if (typeof parameters === "string") {
          try {
            parameters = JSON.parse(parameters);
          } catch (e) {
            parameters = { type: "object", properties: {} };
          }
        }

        parameters = this.fixJsonSchema(parameters);

        if (!parameters.type) {
          parameters.type = "object";
        }
        if (!parameters.properties) {
          parameters.properties = {};
        }

        return {
          type: "function" as const,
          function: {
            name: tool.name,
            description: tool.description || `Tool: ${tool.name}`,
            parameters,
          },
        };
      });

      // Add local tools
      const localTools: ChatCompletionTool[] = [
        getAnalysisToolDefinition(),
        getCurrentPriceToolDefinition(),
        getTradingToolDefinition(),
      ];

      // Combine server and local tools
      this.tools = [...serverTools, ...localTools];

      // console.log(
      //   "Connected to server with tools:",
      //   this.tools.map((tool) => tool.function.name)
      // );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    // Add the new user message to conversation history
    this.conversationHistory.push({
      role: "user",
      content: query,
    });

    let finalText: string[] = [];
    let maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const response = await this.openai.chat.completions.create({
        model,
        max_tokens: 1000,
        messages: this.conversationHistory,
        tools: this.tools,
      });

      const choice = response.choices[0];

      if (choice?.message) {
        this.conversationHistory.push(choice.message);

        if (choice.message.content) {
          finalText.push(choice.message.content);
        }
      }

      if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          let result;

          // Check if this is a local tool
          if (toolName === "performAnalysis") {
            // Show waiting message for analysis
            const chalk = (await import("chalk")).default;
            console.log(
              chalk.yellow(
                "⏳ Fetching market data and generating analysis... Please wait."
              )
            );

            result = await performAnalysis(toolArgs.token);
            result = { content: result };
          } else if (toolName === "getCurrentPrice") {
            // Show waiting message for price fetch
            const chalk = (await import("chalk")).default;
            console.log(
              chalk.yellow("📡 Fetching current price... Please wait.")
            );

            result = await getCurrentPrice(toolArgs.token);
            result = { content: result };
          } else if (toolName === "executeTrade") {
            // Show waiting message for trade execution
            const chalk = (await import("chalk")).default;
            console.log(
              chalk.yellow(
                "🔍 Checking USDT balance and executing trade... Please wait."
              )
            );

            result = await executeTrade(
              this.mcp,
              toolArgs.token,
              toolArgs.amount
            );
            result = { content: result };
          } else {
            // Call server tool
            result = await this.mcp.callTool({
              name: toolName,
              arguments: toolArgs,
            });
          }

          finalText.push(
            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
          );

          this.conversationHistory.push({
            role: "tool",
            content: result.content as string,
            tool_call_id: toolCall.id,
          });
        }
      } else {
        break;
      }
    }

    return finalText.join("\n");
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const chalk = (await import("chalk")).default;
      console.log(chalk.cyan("\nMCP Client Started!"));
      console.log(
        chalk.cyan(
          "Type your queries and I'll help you with trading analysis and blockchain operations!"
        )
      );

      while (true) {
        const message = await rl.question(chalk.green("\nUser: "));
        const lower = message.toLowerCase();
        if (lower === "quit" || lower === "exit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log(chalk.blue("\nAssistant:"));
        console.log(chalk.yellow(response));
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

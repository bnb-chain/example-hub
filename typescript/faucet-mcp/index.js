#!/usr/bin/env node

/**
 * TBNB Faucet MCP Server
 * Model Context Protocol server for distributing testnet BNB tokens
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";

// Configuration
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY || "";

if (!FAUCET_PRIVATE_KEY) {
  console.error("WARNING: FAUCET_PRIVATE_KEY environment variable is not set");
}

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
let wallet = null;
let walletAddress = null;

if (FAUCET_PRIVATE_KEY) {
  wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
  walletAddress = wallet.address;
}

// MCP Server
const server = new Server(
  {
    name: "tbnb-faucet",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_tbnb",
        description: "Send testnet BNB tokens to a specified address on BSC testnet",
        inputSchema: {
          type: "object",
          properties: {
            recipient: {
              type: "string",
              description: "The BSC testnet address that will receive the TBNB tokens",
            },
            amount: {
              type: "number",
              description: "Amount of TBNB to send (default: 0.1, maximum: 1.0)",
              default: 0.1,
            },
          },
          required: ["recipient"],
        },
      },
      {
        name: "get_faucet_info",
        description: "Get information about the faucet including current balance",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_balance",
        description: "Get the TBNB balance of a BSC testnet address",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The BSC testnet address to check",
            },
          },
          required: ["address"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send_tbnb":
        return await handleSendTbnb(args);
      case "get_faucet_info":
        return await handleGetFaucetInfo();
      case "get_balance":
        return await handleGetBalance(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Send TBNB to a recipient address
 */
async function handleSendTbnb(args) {
  if (!wallet) {
    throw new Error("Faucet wallet not configured. Please set FAUCET_PRIVATE_KEY.");
  }

  const recipient = args?.recipient;
  const amount = args?.amount || 0.1;

  if (!recipient) {
    throw new Error("Recipient address is required");
  }

  // Validate address
  if (!ethers.isAddress(recipient)) {
    throw new Error(`Invalid address: ${recipient}`);
  }

  const recipientAddress = ethers.getAddress(recipient);

  // Prevent self-transfer
  if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
    throw new Error("Cannot send tokens to the faucet address itself");
  }

  // Validate amount
  if (amount <= 0 || amount > 1.0) {
    throw new Error("Amount must be between 0 and 1.0 TBNB");
  }

  try {
    // Convert amount to Wei
    const amountWei = ethers.parseEther(amount.toString());

    // Get current gas price
    const feeData = await provider.getFeeData();

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: recipientAddress,
      value: amountWei,
      gasLimit: 21000,
      gasPrice: feeData.gasPrice,
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              transactionHash: tx.hash,
              recipient: recipientAddress,
              amount: amount,
              amountWei: amountWei.toString(),
              blockNumber: receipt.blockNumber,
              status: receipt.status === 1 ? "confirmed" : "failed",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Get faucet information and balance
 */
async function handleGetFaucetInfo() {
  if (!walletAddress) {
    throw new Error("Faucet wallet not configured");
  }

  try {
    const balance = await provider.getBalance(walletAddress);
    const balanceTbnb = ethers.formatEther(balance);

    // Get network info
    const network = await provider.getNetwork();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              faucetAddress: walletAddress,
              balanceWei: balance.toString(),
              balanceTbnb: parseFloat(balanceTbnb),
              network: {
                name: "BSC Testnet",
                chainId: network.chainId.toString(),
              },
              rpcEndpoint: BSC_TESTNET_RPC,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get faucet info: ${error.message}`);
  }
}

/**
 * Get balance of an address
 */
async function handleGetBalance(args) {
  const address = args?.address;

  if (!address) {
    throw new Error("Address is required");
  }

  // Validate address
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  try {
    const addressChecksum = ethers.getAddress(address);
    const balance = await provider.getBalance(addressChecksum);
    const balanceTbnb = ethers.formatEther(balance);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              address: addressChecksum,
              balanceWei: balance.toString(),
              balanceTbnb: parseFloat(balanceTbnb),
              network: "BSC Testnet",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("TBNB Faucet MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

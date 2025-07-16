import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  encodeAbiParameters,
  erc20Abi,
  maxUint256,
} from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

// Contract addresses
const USDT_TOKEN_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const PERMIT2_ADDRESS = "0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768";
const UNIVERSAL_ROUTER_ADDRESS = "0x1A0A18AC4BECDDbd6389559687d1A73d8927E416";
const WBNB_TOKEN_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// Permit2 allowance ABI
const allowanceAbi = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Universal Router ABI
const universalRouterAbi = [
  {
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    name: "execute",
    outputs: [{ name: "", type: "bytes[]" }],
    stateMutability: "payable",
    type: "function",
  },
];

/**
 * Create Viem clients for public and user operations
 * @returns {publicClient, userClient, account}
 */
function createViemClients() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(),
  });

  const userClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(),
  });

  return { publicClient, userClient, account };
}

/**
 * Swap USDT for BNB using PancakeSwap Universal Router
 * @param walletAddress User's wallet address
 * @param amountIn Amount of USDT to swap (in wei)
 * @param bnbPrice Current BNB price in USD
 * @returns Transaction receipt
 */
export async function swapUSDTForBNB(
  walletAddress: `0x${string}`,
  amountIn: bigint,
  bnbPrice: number
) {
  console.log("🚀 Starting USDT to BNB swap...");
  console.log(`💰 Amount: ${formatEther(amountIn)} USDT`);
  console.log(`📊 BNB Price: $${bnbPrice}`);

  const { publicClient, userClient } = createViemClients();

  try {
    // Check allowance of USDT to universal router
    console.log("🔍 Checking USDT allowance...");
    const allowance = await publicClient.readContract({
      address: USDT_TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [walletAddress, PERMIT2_ADDRESS as `0x${string}`],
    });

    if (allowance === BigInt(0)) {
      console.log("✅ Approving USDT for Permit2...");
      const tx = await userClient.writeContract({
        address: USDT_TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [PERMIT2_ADDRESS as `0x${string}`, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log("✅ USDT approval completed");
    } else {
      console.log("✅ USDT already approved");
    }

    // Universal router commands: PERMIT2_PERMIT (0x0a) + V3_SWAP_EXACT_IN (0x00) + UNWRAP_ETH (0x0c)
    const commands = "0x0a000c";

    // Prepare Permit2 domain
    const permit2Domain = {
      name: "Permit2",
      chainId: publicClient.chain.id,
      verifyingContract: PERMIT2_ADDRESS as `0x${string}`,
    };

    // Prepare Permit2 types
    const permit2Types = {
      PermitSingle: [
        { name: "details", type: "PermitDetails" },
        { name: "spender", type: "address" },
        { name: "sigDeadline", type: "uint256" },
      ],
      PermitDetails: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" },
      ],
    };

    // Prepare Permit2 permitSingle
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
    const allowanceResult = (await publicClient.readContract({
      address: PERMIT2_ADDRESS as `0x${string}`,
      abi: allowanceAbi,
      functionName: "allowance",
      args: [
        walletAddress,
        USDT_TOKEN_ADDRESS as `0x${string}`,
        UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
      ],
    })) as [bigint, bigint, bigint];

    const [, , nonce] = allowanceResult;

    const permitSingle = {
      details: {
        token: USDT_TOKEN_ADDRESS as `0x${string}`,
        amount: amountIn,
        expiration: deadline,
        nonce: Number(nonce),
      },
      spender: UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
      sigDeadline: BigInt(deadline),
    };

    console.log("✍️ Generating Permit2 signature...");
    // Generate Permit2 signature using userClient
    const permitSignature = await userClient.signTypedData({
      domain: permit2Domain,
      types: permit2Types,
      primaryType: "PermitSingle",
      message: permitSingle,
    });

    // Prepare Permit2 input
    const permitInput = encodeAbiParameters(
      [
        {
          name: "permitSingle",
          type: "tuple",
          components: [
            {
              name: "details",
              type: "tuple",
              components: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint160" },
                { name: "expiration", type: "uint48" },
                { name: "nonce", type: "uint48" },
              ],
            },
            { name: "spender", type: "address" },
            { name: "sigDeadline", type: "uint256" },
          ],
        },
        { name: "signature", type: "bytes" },
      ],
      [permitSingle, permitSignature]
    );

    // Prepare swap input
    const fee = 100; // 0.01% fee tier
    const path = ("0x" +
      USDT_TOKEN_ADDRESS.slice(2).padStart(40, "0") +
      fee.toString(16).padStart(6, "0") +
      WBNB_TOKEN_ADDRESS.slice(2).padStart(40, "0")) as `0x${string}`;

    const amountOutMin = parseEther(
      ((Number(formatEther(amountIn)) * 0.95) / bnbPrice).toString()
    );

    const swapInput = encodeAbiParameters(
      [
        { name: "recipient", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "bytes" },
        { name: "payerIsUser", type: "bool" },
      ],
      [
        UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
        amountIn,
        amountOutMin,
        path,
        true,
      ]
    );

    // Prepare unwrap input
    const unwrapInput = encodeAbiParameters(
      [
        { name: "recipient", type: "address" },
        { name: "amountMin", type: "uint256" },
      ],
      [walletAddress, amountOutMin]
    );

    console.log("🔄 Executing swap via Universal Router...");
    // Execute via universal router
    const inputs = [permitInput, swapInput, unwrapInput];
    const tx = await userClient.writeContract({
      address: UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
      abi: universalRouterAbi,
      functionName: "execute",
      args: [commands, inputs, deadline],
    });

    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

    console.log("✅ Swap completed successfully!");
    console.log(`📝 Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error("❌ Swap failed:", error);
    throw error;
  }
}

/**
 * Execute USDT to BNB swap with 10 USDT
 * @param walletAddress User's wallet address
 * @param bnbPrice Current BNB price
 * @returns Transaction receipt
 */
export async function executeUSDTToBNBSwap(
  walletAddress: string,
  bnbPrice: number
) {
  const amountIn = parseEther("10"); // 10 USDT
  return await swapUSDTForBNB(
    walletAddress as `0x${string}`,
    amountIn,
    bnbPrice
  );
}

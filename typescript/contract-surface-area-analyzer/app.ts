import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';

dotenv.config();

export interface FunctionAnalysis {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  visibility: 'public' | 'external' | 'internal' | 'private';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: Array<{ name: string; type: string; indexed?: boolean }>;
  outputs: Array<{ name: string; type: string }>;
  modifiers?: string[];
}

export interface EventAnalysis {
  name: string;
  inputs: Array<{ name: string; type: string; indexed: boolean }>;
}

export interface SurfaceAreaAnalysis {
  contractAddress: string;
  isProxy: boolean;
  implementationAddress?: string;
  totalFunctions: number;
  publicFunctions: number;
  externalFunctions: number;
  payableFunctions: number;
  functions: FunctionAnalysis[];
  totalEvents: number;
  events: EventAnalysis[];
  hasFallback: boolean;
  hasReceive: boolean;
  complexityScore: number;
  riskFactors: string[];
}

/**
 * Get provider for BSC network
 */
export function getBSCProvider(): ethers.Provider {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Check if an address is a contract
 */
export async function isContract(address: string, provider: ethers.Provider): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    return code !== '0x' && code !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Check if contract is a proxy (EIP-1967 standard)
 */
export async function checkProxy(contractAddress: string, provider: ethers.Provider): Promise<{
  isProxy: boolean;
  implementationAddress?: string;
}> {
  try {
    // EIP-1967 implementation slot
    const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    
    const storage = await provider.getStorage(contractAddress, IMPLEMENTATION_SLOT);
    
    if (storage && storage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const implementation = '0x' + storage.slice(-40);
      return {
        isProxy: true,
        implementationAddress: ethers.getAddress(implementation)
      };
    }
    
    return { isProxy: false };
  } catch (error) {
    return { isProxy: false };
  }
}

/**
 * Get contract ABI from bytecode (simplified - in production, use verified contracts)
 * For this demo, we'll use the interface to get ABI if available
 */
export async function getContractABI(
  contractAddress: string,
  provider: ethers.Provider
): Promise<ethers.Interface | null> {
  try {
    // Try to get ABI from etherscan-like services or use minimal interface
    // For this example, we'll create a minimal interface that can decode common calls
    // In production, you'd fetch from a verified contract source
    
    // We'll use a generic approach - try to get the contract and infer from common patterns
    const code = await provider.getCode(contractAddress);
    if (!code || code === '0x') {
      return null;
    }
    
    // For demo purposes, we'll return null and let the caller handle it
    // In a real implementation, you'd fetch from BSCScan API or similar
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze contract ABI to extract surface area information
 */
export function analyzeABI(abi: ethers.InterfaceAbi): {
  functions: FunctionAnalysis[];
  events: EventAnalysis[];
  hasFallback: boolean;
  hasReceive: boolean;
} {
  const functions: FunctionAnalysis[] = [];
  const events: EventAnalysis[] = [];
  let hasFallback = false;
  let hasReceive = false;

  try {
    const iface = new ethers.Interface(abi);
    
    // Analyze functions
    for (const fragment of iface.fragments) {
      if (fragment.type === 'function') {
        const func = fragment as ethers.FunctionFragment;
        // In ethers v6, visibility is not directly available on FunctionFragment
        // We infer it: if function has a name and is not a constructor, it's public or external
        // For simplicity, we'll default to 'public' (most common case)
        // External functions are typically those that can't be called internally
        const visibility: 'public' | 'external' | 'internal' | 'private' = 'public';
        
        functions.push({
          name: func.name,
          type: 'function',
          visibility: visibility,
          stateMutability: func.stateMutability as 'pure' | 'view' | 'nonpayable' | 'payable',
          inputs: func.inputs.map(input => ({
            name: input.name || '',
            type: input.type
          })),
          outputs: func.outputs.map(output => ({
            name: output.name || '',
            type: output.type
          }))
        });
      } else if (fragment.type === 'event') {
        const event = fragment as ethers.EventFragment;
        events.push({
          name: event.name,
          inputs: event.inputs.map(input => ({
            name: input.name || '',
            type: input.type,
            indexed: input.indexed || false
          }))
        });
      } else if (fragment.type === 'fallback') {
        hasFallback = true;
      }
    }
    
    // Check for receive function explicitly in the raw ABI (ethers v6 doesn't expose it as a fragment)
    if (Array.isArray(abi)) {
      // Check if any item is a receive function (can be string or object)
      const receiveFunction = abi.find((item: any) => {
        if (typeof item === 'string') {
          return item.trim().startsWith('receive()');
        } else if (item && typeof item === 'object') {
          return item.type === 'receive';
        }
        return false;
      });
      if (receiveFunction) {
        hasReceive = true;
      }
    }
  } catch (error) {
    // If ABI parsing fails, return empty results
  }

  return { functions, events, hasFallback, hasReceive };
}

/**
 * Calculate complexity score based on surface area
 */
export function calculateComplexityScore(analysis: {
  totalFunctions: number;
  publicFunctions: number;
  externalFunctions: number;
  payableFunctions: number;
  totalEvents: number;
  hasFallback: boolean;
  hasReceive: boolean;
}): number {
  let score = 0;
  
  // Base complexity from total functions
  score += analysis.totalFunctions * 2;
  
  // Public/external functions are more exposed
  score += analysis.publicFunctions * 3;
  score += analysis.externalFunctions * 3;
  
  // Payable functions increase attack surface
  score += analysis.payableFunctions * 5;
  
  // Events indicate contract activity
  score += analysis.totalEvents * 1;
  
  // Fallback and receive functions are high risk
  if (analysis.hasFallback) score += 10;
  if (analysis.hasReceive) score += 10;
  
  return score;
}

/**
 * Identify risk factors based on analysis
 */
export function identifyRiskFactors(analysis: {
  publicFunctions: number;
  externalFunctions: number;
  payableFunctions: number;
  hasFallback: boolean;
  hasReceive: boolean;
  isProxy: boolean;
}): string[] {
  const risks: string[] = [];
  
  if (analysis.publicFunctions > 20) {
    risks.push('High number of public functions increases attack surface');
  }
  
  if (analysis.externalFunctions > 15) {
    risks.push('Many external functions may indicate complex interaction patterns');
  }
  
  if (analysis.payableFunctions > 5) {
    risks.push('Multiple payable functions increase financial risk exposure');
  }
  
  if (analysis.hasFallback) {
    risks.push('Fallback function can receive unexpected calls');
  }
  
  if (analysis.hasReceive) {
    risks.push('Receive function automatically accepts ETH transfers');
  }
  
  if (analysis.isProxy) {
    risks.push('Proxy pattern adds upgradeability risk');
  }
  
  if (risks.length === 0) {
    risks.push('No significant risk factors identified');
  }
  
  return risks;
}

/**
 * Analyze contract surface area
 */
export async function analyzeContractSurfaceArea(
  contractAddress: string,
  abi?: ethers.InterfaceAbi
): Promise<SurfaceAreaAnalysis> {
  const provider = getBSCProvider();
  
  // Normalize address
  const normalizedAddress = ethers.getAddress(contractAddress);
  
  // Check if it's a contract
  const isContractAddress = await isContract(normalizedAddress, provider);
  if (!isContractAddress) {
    throw new Error('Address is not a contract');
  }
  
  // Check for proxy
  const proxyInfo = await checkProxy(normalizedAddress, provider);
  
  // Analyze ABI
  let functions: FunctionAnalysis[] = [];
  let events: EventAnalysis[] = [];
  let hasFallback = false;
  let hasReceive = false;
  
  if (abi) {
    const abiAnalysis = analyzeABI(abi);
    functions = abiAnalysis.functions;
    events = abiAnalysis.events;
    hasFallback = abiAnalysis.hasFallback;
    hasReceive = abiAnalysis.hasReceive;
  }
  
  const publicFunctions = functions.filter(f => f.visibility === 'public').length;
  const externalFunctions = functions.filter(f => f.visibility === 'external').length;
  const payableFunctions = functions.filter(f => f.stateMutability === 'payable').length;
  
  const complexityScore = calculateComplexityScore({
    totalFunctions: functions.length,
    publicFunctions,
    externalFunctions,
    payableFunctions,
    totalEvents: events.length,
    hasFallback,
    hasReceive
  });
  
  const riskFactors = identifyRiskFactors({
    publicFunctions,
    externalFunctions,
    payableFunctions,
    hasFallback,
    hasReceive,
    isProxy: proxyInfo.isProxy
  });
  
  return {
    contractAddress: normalizedAddress,
    isProxy: proxyInfo.isProxy,
    implementationAddress: proxyInfo.implementationAddress,
    totalFunctions: functions.length,
    publicFunctions,
    externalFunctions,
    payableFunctions,
    functions,
    totalEvents: events.length,
    events,
    hasFallback,
    hasReceive,
    complexityScore,
    riskFactors
  };
}

/**
 * Get common contract ABIs for well-known contracts on BSC
 */
export function getCommonContractABI(contractType: 'ERC20' | 'ERC721' | 'ERC1155' | 'UNISWAP_V2' | 'UNISWAP_V3'): ethers.InterfaceAbi {
  const abis: Record<string, ethers.InterfaceAbi> = {
    ERC20: [
      'function totalSupply() external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)',
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event Approval(address indexed owner, address indexed spender, uint256 value)'
    ],
    ERC721: [
      'function balanceOf(address owner) external view returns (uint256)',
      'function ownerOf(uint256 tokenId) external view returns (address)',
      'function safeTransferFrom(address from, address to, uint256 tokenId) external',
      'function transferFrom(address from, address to, uint256 tokenId) external',
      'function approve(address to, uint256 tokenId) external',
      'function setApprovalForAll(address operator, bool approved) external',
      'function getApproved(uint256 tokenId) external view returns (address)',
      'function isApprovedForAll(address owner, address operator) external view returns (bool)',
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
      'event Approval(address indexed owner, address indexed approved, address indexed tokenId)',
      'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
    ],
    UNISWAP_V2: [
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
      'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)'
    ]
  };
  
  return abis[contractType] || [];
}

/**
 * Main function for CLI usage
 */
export async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  const contractType = (process.env.CONTRACT_TYPE || process.argv[3]) as 'ERC20' | 'ERC721' | 'ERC1155' | 'UNISWAP_V2' | 'UNISWAP_V3' | undefined;
  
  if (!contractAddress) {
    console.error('Usage: npm start [contract-address] [contract-type]');
    console.error('Or set CONTRACT_ADDRESS and optionally CONTRACT_TYPE in .env file');
    console.error('Or run without arguments to start the web server');
    console.error('Contract types: ERC20, ERC721, ERC1155, UNISWAP_V2, UNISWAP_V3');
    process.exit(1);
  }
  
  let abi: ethers.InterfaceAbi | undefined;
  if (contractType) {
    abi = getCommonContractABI(contractType);
  }
  
  console.log(`Analyzing contract surface area for: ${contractAddress}`);
  if (contractType) {
    console.log(`Using ${contractType} ABI template`);
  }
  
  try {
    const result = await analyzeContractSurfaceArea(contractAddress, abi);
    
    console.log(`\n=== Contract Surface Area Analysis ===`);
    console.log(`Contract: ${result.contractAddress}`);
    console.log(`Is Proxy: ${result.isProxy}`);
    if (result.implementationAddress) {
      console.log(`Implementation: ${result.implementationAddress}`);
    }
    console.log(`\nFunctions: ${result.totalFunctions} total`);
    console.log(`  - Public: ${result.publicFunctions}`);
    console.log(`  - External: ${result.externalFunctions}`);
    console.log(`  - Payable: ${result.payableFunctions}`);
    console.log(`Events: ${result.totalEvents}`);
    console.log(`Has Fallback: ${result.hasFallback}`);
    console.log(`Has Receive: ${result.hasReceive}`);
    console.log(`Complexity Score: ${result.complexityScore}`);
    
    console.log(`\nRisk Factors:`);
    result.riskFactors.forEach(risk => console.log(`  - ${risk}`));
    
    if (result.functions.length > 0) {
      console.log(`\nFunctions:`);
      result.functions.forEach(func => {
        console.log(`  ${func.visibility} ${func.stateMutability} ${func.name}(${func.inputs.map(i => `${i.type} ${i.name}`).join(', ')})`);
      });
    }
    
    if (result.events.length > 0) {
      console.log(`\nEvents:`);
      result.events.forEach(event => {
        console.log(`  event ${event.name}(${event.inputs.map(i => `${i.indexed ? 'indexed ' : ''}${i.type} ${i.name}`).join(', ')})`);
      });
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Start Express server for web UI
 */
export function startServer(port: number = 3000) {
  const app = express();
  
  app.use(express.json());
  
  // Serve static files from root directory
  app.use(express.static(__dirname));
  
  app.get('/', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, 'frontend.html'));
  });
  
  app.post('/api/analyze', async (req: express.Request, res: express.Response) => {
    try {
      const { contractAddress, contractType } = req.body;
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      let abi: ethers.InterfaceAbi | undefined;
      if (contractType) {
        abi = getCommonContractABI(contractType as any);
      }
      
      const result = await analyzeContractSurfaceArea(contractAddress, abi);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to analyze contract' });
    }
  });
  
  app.listen(port, () => {
    console.log(`Contract Surface Area Analyzer server running on http://localhost:${port}`);
    console.log('Open your browser to view the UI');
  });
}

// Run if executed directly
if (require.main === module) {
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2];
  
  // If no arguments and no env var, start server by default
  if (!contractAddress || process.argv[2] === 'server') {
    const port = parseInt(process.env.PORT || process.argv[3] || '3000');
    startServer(port);
  } else {
    main().catch(console.error);
  }
}


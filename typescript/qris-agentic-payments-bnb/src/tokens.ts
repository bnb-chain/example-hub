/**
 * Curated BNB Chain stablecoin token registry.
 *
 * The BNB Chain x402 / MPP ecosystem supports multiple native stablecoins — not
 * just BUSD. Binance x402 (the production facilitator) natively supports FDUSD
 * and $U (the gasless EIP-3009 stablecoin used by BNBAgent SDK). This module
 * lets the agent settle in whichever curated token the merchant prefers, with
 * correct decimals and EIP-3009 domain metadata for the `authorization`
 * credential path.
 *
 * The registry is deliberately small and verifiable. Each entry carries the
 * on-chain address, decimals, and EIP-3009 domain (name + version) so the MPP
 * `authorization` credential can be built correctly. For the local Hardhat
 * demo we include MockBUSD alongside the real mainnet entries.
 *
 * Source for real addresses: mpp-sdk `src/server/curated.ts` + BSCScan.
 */

export interface TokenEntry {
  /** Lowercase symbol used as the registry key. */
  symbol: string;
  /** On-chain contract address. */
  address: `0x${string}`;
  /** Token decimals (BSC stablecoins are 18). */
  decimals: number;
  /** Human-readable name. */
  name: string;
  /** EIP-3009 domain separator metadata (for `authorization` credentials). */
  eip3009?: { name: string; version: string };
  /** Chain ID where this token lives (56 = BSC mainnet, 31337 = local). */
  chainId: number;
  /** True when the token supports EIP-3009 transferWithAuthorization. */
  hasEip3009: boolean;
}

const MAINNET_ENTRIES: TokenEntry[] = [
  {
    symbol: "busd",
    name: "Binance USD",
    address: "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12",
    decimals: 18,
    eip3009: { name: "BUSD", version: "2" },
    chainId: 56,
    hasEip3009: true,
  },
  {
    symbol: "fdusd",
    name: "First Digital USD",
    address: "0xc5f0f7b45fce849dc2827b3c1c37524f3e21f51d",
    decimals: 18,
    eip3009: { name: "First Digital USD", version: "1" },
    chainId: 56,
    hasEip3009: true,
  },
  {
    symbol: "u",
    name: "U",
    address: "0x4e59c368eb880c4ead6c2acc2f9a8ddec6928d1a",
    decimals: 18,
    eip3009: { name: "U", version: "1" },
    chainId: 56,
    hasEip3009: true,
  },
];

/**
 * Token registry. Lookup by symbol (case-insensitive) or address.
 * For the local Hardhat demo, MockBUSD is registered at the deployed address.
 */
export class TokenRegistry {
  private readonly bySymbol = new Map<string, TokenEntry>();
  private readonly byAddress = new Map<string, TokenEntry>();

  constructor(entries: TokenEntry[] = MAINNET_ENTRIES) {
    for (const e of entries) {
      this.bySymbol.set(e.symbol.toLowerCase(), e);
      this.byAddress.set(e.address.toLowerCase(), e);
    }
  }

  /** Register a local/demo token (e.g. MockBUSD on the Hardhat network). */
  register(entry: TokenEntry): void {
    this.bySymbol.set(entry.symbol.toLowerCase(), entry);
    this.byAddress.set(entry.address.toLowerCase(), entry);
  }

  resolve(symbolOrAddress: string): TokenEntry {
    const lc = symbolOrAddress.toLowerCase();
    const bySym = this.bySymbol.get(lc);
    if (bySym) return bySym;
    const byAddr = this.byAddress.get(lc);
    if (byAddr) return byAddr;
    throw new Error(`TokenRegistry: unknown token "${symbolOrAddress}"`);
  }

  /** List all registered symbols. */
  symbols(): string[] {
    return [...this.bySymbol.keys()];
  }

  /** Check if a token supports EIP-3009 gasless transfers. */
  supportsEip3009(symbolOrAddress: string): boolean {
    try {
      return this.resolve(symbolOrAddress).hasEip3009;
    } catch {
      return false;
    }
  }
}

/** Default singleton with mainnet BSC entries preloaded. */
export const defaultRegistry = new TokenRegistry();

/**
 * ERC-8004 Agent Identity — on-chain identity + reputation for the payment agent.
 *
 * ERC-8004 is the BNB Chain standard for AI agent identity. Each agent gets:
 *   - An on-chain identity token (ERC-721) minted to its wallet address
 *   - A discoverable profile (name, description, protocol endpoints)
 *   - Metadata (arbitrary key-value pairs)
 *   - A reputation that builds over time from on-chain activity
 *
 * Registration is gas-free on BSC Testnet and Mainnet via MegaFuel paymaster
 * sponsorship. For this cookbook we model the identity seam as an interface so
 * the demo can run offline, while production wires in the real ERC-8004
 * registry contract (see BNB Chain BNBAgent SDK docs).
 *
 * The identity is used to:
 *   1. Attest that the payment came from a registered agent (not a random EOA)
 *   2. Read the agent's reputation before settling high-value payments
 *   3. Make the agent discoverable in the BNB Chain agent marketplace
 */

export interface AgentIdentity {
  /** The agentId (ERC-721 token ID) on the ERC-8004 registry. */
  agentId: string;
  /** Wallet address bound to this agent identity. */
  wallet: `0x${string}`;
  /** Human-readable name. */
  name: string;
  /** Description of what the agent does. */
  description: string;
  /** Protocol endpoints the agent speaks (e.g. x402 charge URL). */
  endpoints: string[];
  /** Arbitrary metadata key-value pairs. */
  metadata: Record<string, string>;
  /** Block number when the identity was registered. */
  registeredAtBlock?: number;
}

export interface AgentReputation {
  /** Total jobs completed (from ERC-8183 commerce or off-chain attestations). */
  jobsCompleted: number;
  /** Total payment volume in USD (18-decimal base units). */
  totalVolumeUsd: bigint;
  /** Number of disputes raised against this agent. */
  disputes: number;
  /** Reputation score (0-100, computed from on-chain activity). */
  score: number;
  /** Last active timestamp (seconds since epoch). */
  lastActive: number;
}

/**
 * Identity provider — resolves agent identity and reputation.
 * The demo uses an in-memory stub; production uses the ERC-8004 registry.
 */
export interface IdentityProvider {
  /** Resolve the identity for a given wallet address. */
  resolveIdentity(wallet: `0x${string}`): Promise<AgentIdentity | null>;
  /** Read the reputation for a given agentId. */
  getReputation(agentId: string): Promise<AgentReputation>;
  /** Register a new agent identity (gas-free on BSC via MegaFuel). */
  register(params: {
    wallet: `0x${string}`;
    name: string;
    description: string;
    endpoints?: string[];
    metadata?: Record<string, string>;
  }): Promise<AgentIdentity>;
}

/** In-memory identity provider for the demo/tests. */
export class LocalIdentityProvider implements IdentityProvider {
  private readonly identities = new Map<string, AgentIdentity>();
  private readonly reputations = new Map<string, AgentReputation>();
  private nextId = 1;

  async register(params: {
    wallet: `0x${string}`;
    name: string;
    description: string;
    endpoints?: string[];
    metadata?: Record<string, string>;
  }): Promise<AgentIdentity> {
    const agentId = `agent-${this.nextId++}`;
    const identity: AgentIdentity = {
      agentId,
      wallet: params.wallet,
      name: params.name,
      description: params.description,
      endpoints: params.endpoints ?? [],
      metadata: params.metadata ?? {},
    };
    this.identities.set(params.wallet.toLowerCase(), identity);
    this.reputations.set(agentId, {
      jobsCompleted: 0,
      totalVolumeUsd: 0n,
      disputes: 0,
      score: 50,
      lastActive: Math.floor(Date.now() / 1000),
    });
    return identity;
  }

  async resolveIdentity(wallet: `0x${string}`): Promise<AgentIdentity | null> {
    return this.identities.get(wallet.toLowerCase()) ?? null;
  }

  async getReputation(agentId: string): Promise<AgentReputation> {
    // SEC-10 FIX: Return a zero-score reputation for unknown agentIds
    // instead of a default score 50. Unknown agents should NOT pass the
    // reputation gate. A score of 0 is blocked by reputationGate (score < 20).
    return (
      this.reputations.get(agentId) ?? {
        jobsCompleted: 0,
        totalVolumeUsd: 0n,
        disputes: 0,
        score: 0,
        lastActive: 0,
      }
    );
  }

  /** Record a completed payment to update reputation (demo only). */
  recordPayment(agentId: string, volumeUsd: bigint): void {
    const rep = this.reputations.get(agentId);
    if (!rep) return;
    rep.jobsCompleted++;
    rep.totalVolumeUsd += volumeUsd;
    rep.score = Math.min(100, rep.score + 1);
    rep.lastActive = Math.floor(Date.now() / 1000);
    this.reputations.set(agentId, rep);
  }
}

/**
 * Reputation gate — rejects payments when the agent's reputation is too low.
 * Mirrors the trust model in BNBAgent SDK: agents with low scores are
 * restricted from high-value transactions.
 */
export function reputationGate(
  reputation: AgentReputation,
  maxAmountUsd: bigint
): { allowed: boolean; reason?: string } {
  if (reputation.score < 20) {
    return { allowed: false, reason: "Agent reputation too low (<20)" };
  }
  if (reputation.disputes > 3) {
    return { allowed: false, reason: "Too many disputes (>3)" };
  }
  // New agents (score 50, 0 jobs) are capped at small payments.
  if (reputation.jobsCompleted < 5 && maxAmountUsd > 10n * 10n ** 18n) {
    return {
      allowed: false,
      reason: "New agent capped at 10 USD until 5 jobs completed",
    };
  }
  return { allowed: true };
}

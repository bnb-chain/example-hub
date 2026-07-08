/**
 * Spend policy — guardrails for autonomous agent spending.
 *
 * Mirrors the BNB Agent Studio model: an agent self-funds from a treasury
 * wallet but must stay within user-confirmed guardrails:
 *   - Balance threshold: minimum balance before auto-refill triggers
 *   - Refill amount: how much to top up when threshold is hit
 *   - Daily spend cap: maximum total spending per day
 *   - Per-transaction cap: maximum single payment
 *   - Allowlisted recipients: only pay known settlement addresses
 *
 * The policy is checked BEFORE any payment is broadcast. A violation stops the
 * transaction and surfaces a human-readable reason — the agent never silently
 * exceeds its limits.
 */

export interface SpendRules {
  /** Minimum balance before auto-refill (in token base units). */
  balanceThreshold?: bigint;
  /** Amount to top up when balance hits threshold (in token base units). */
  refillAmount?: bigint;
  /** Maximum total spending per UTC day (in token base units). */
  dailyCap?: bigint;
  /** Maximum single transaction amount (in token base units). */
  perTxCap?: bigint;
  /** Allowlisted recipient addresses (lowercase). Empty = allow all. */
  allowlist?: `0x${string}`[];
  /** Blocklist of recipient addresses (lowercase). */
  blocklist?: `0x${string}`[];
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  /** Updated daily spend tracker after this payment would be approved. */
  projectedDailySpend?: bigint;
}

export class SpendPolicy {
  private dailySpend = new Map<string, bigint>(); // date-UTC -> amount

  constructor(private readonly rules: SpendRules) {}

  /** Check if a payment of `amount` to `recipient` is allowed. */
  check(
    recipient: `0x${string}`,
    amount: bigint,
    currentBalance?: bigint
  ): PolicyCheckResult {
    // SEC-08 FIX: Reject negative amounts — they bypass all caps.
    if (amount < 0n) {
      return { allowed: false, reason: `Negative amount ${amount} rejected` };
    }

    const recipientLc = recipient.toLowerCase() as `0x${string}`;

    // 1. Blocklist
    if (this.rules.blocklist?.some((a) => a.toLowerCase() === recipientLc)) {
      return { allowed: false, reason: "Recipient is blocklisted" };
    }

    // 2. Allowlist
    if (
      this.rules.allowlist &&
      this.rules.allowlist.length > 0 &&
      !this.rules.allowlist.some((a) => a.toLowerCase() === recipientLc)
    ) {
      return { allowed: false, reason: "Recipient not in allowlist" };
    }

    // 3. Per-tx cap
    if (this.rules.perTxCap && amount > this.rules.perTxCap) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds per-tx cap ${this.rules.perTxCap}`,
      };
    }

    // 4. Daily cap
    if (this.rules.dailyCap) {
      const today = this.todayKey();
      const spent = this.dailySpend.get(today) ?? 0n;
      const projected = spent + amount;
      if (projected > this.rules.dailyCap) {
        return {
          allowed: false,
          reason: `Daily spend ${projected} would exceed cap ${this.rules.dailyCap}`,
        };
      }
      return { allowed: true, projectedDailySpend: projected };
    }

    // 5. Balance threshold (informational — the caller should check + refill)
    if (
      this.rules.balanceThreshold !== undefined &&
      currentBalance !== undefined &&
      currentBalance < this.rules.balanceThreshold
    ) {
      return {
        allowed: true, // still allow, but signal the caller to refill
        reason: `Balance ${currentBalance} below threshold ${this.rules.balanceThreshold} — refill needed`,
        projectedDailySpend: this.dailySpend.get(this.todayKey()) ?? 0n,
      };
    }

    return { allowed: true };
  }

  /** Record an approved payment to update the daily spend tracker. */
  record(amount: bigint): void {
    // SEC-08 FIX: Reject negative amounts — they can reduce the tracker
    // and enable cap bypass.
    if (amount < 0n) {
      throw new Error(`SpendPolicy.record: negative amount ${amount} rejected`);
    }
    const today = this.todayKey();
    this.dailySpend.set(today, (this.dailySpend.get(today) ?? 0n) + amount);
  }

  /** Get today's spend total. */
  todaySpend(): bigint {
    return this.dailySpend.get(this.todayKey()) ?? 0n;
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

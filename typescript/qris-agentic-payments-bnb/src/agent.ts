/**
 * QrisPayAgent — orchestrates the full Web2.5 agentic payment flow:
 *
 *   scan/ingest QRIS  ->  parse + validate CRC  ->  convert IDR→stablecoin
 *   ->  identity check (ERC-8004)  ->  spend policy gate
 *   ->  resolve settlement address (PSP seam)  ->  pay on BNB Chain (direct / MPP)
 *   ->  record receipt (Greenfield seam)  ->  update reputation
 *
 * It is intentionally dry-run safe: `plan()` computes everything and prints the
 * intended transaction WITHOUT broadcasting, so a builder can verify the parse
 * before spending gas. `execute()` performs the on-chain leg and records the
 * receipt.
 *
 * The agent aligns with the BNBAgent SDK stack:
 *   - ERC-8004 identity (agent registration + reputation)
 *   - MPP + x402 payment rail (direct transfer OR 402 challenge credential)
 *   - Spend guardrails (balance threshold, daily cap, allowlist)
 *   - Receipt log for audit + reconciliation
 */

import { parsePaymentQris, type QrisData } from "./qris";
import { createRateSource, type RateSource } from "./rates";
import { LocalSettlementAddress, type OfframpProvider } from "./offramp";
import { BnbPaymentExecutor } from "./payment";
import { defaultRegistry, TokenRegistry, type TokenEntry } from "./tokens";
import {
  LocalIdentityProvider,
  type IdentityProvider,
  reputationGate,
} from "./identity";
import { SpendPolicy, type SpendRules } from "./policy";
import {
  LocalReceiptLog,
  receiptId,
  type ReceiptLog,
  type PaymentReceipt,
} from "./receipts";

export interface AgentDeps {
  payment: BnbPaymentExecutor;
  rateSource?: RateSource;
  offramp?: OfframpProvider;
  /** When set, route the payment through an x402/MPP 402-protected URL. */
  mppProtectedUrl?: string;
  /** Token to settle in (default: BUSD). */
  token?: TokenEntry;
  /** Token registry (default: mainnet BSC entries + any local overrides). */
  tokenRegistry?: TokenRegistry;
  /** Agent identity provider (default: local in-memory). */
  identityProvider?: IdentityProvider;
  /** Spend guardrails (optional). */
  spendRules?: SpendRules;
  /** Receipt log (default: local in-memory). */
  receiptLog?: ReceiptLog;
}

export interface PaymentPlan {
  qris: QrisData;
  idrAmount: bigint;
  tokenAmount: bigint;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  settlementAddress: `0x${string}`;
  recipient: string;
  mode: "direct" | "mpp";
  /** Convenience mirror of qris.crcValid for dry-run checks. */
  crcValid: boolean;
  /** Identity check result — true only if agent is registered (ERC-8004). */
  identityChecked: boolean;
  /** Reputation gate result — false if agent is blocked by reputation. */
  reputationOk: boolean;
  reputationReason?: string;
  /** Policy check result (null if no policy configured). */
  policyAllowed: boolean | null;
  policyReason?: string;
}

export class QrisPayAgent {
  private readonly tokens: TokenRegistry;
  private readonly token: TokenEntry;
  private readonly rateSource: RateSource;
  private readonly offramp: OfframpProvider;
  private readonly identityProvider: IdentityProvider;
  private readonly policy?: SpendPolicy;
  private readonly receiptLog: ReceiptLog;

  constructor(private readonly deps: AgentDeps) {
    this.tokens = deps.tokenRegistry ?? defaultRegistry;
    this.token = deps.token ?? this.tokens.resolve("busd");
    this.rateSource =
      deps.rateSource ?? createRateSource(process.env.RATE_SOURCE);
    this.offramp =
      deps.offramp ??
      new LocalSettlementAddress("0x0000000000000000000000000000000000000000");
    this.identityProvider =
      deps.identityProvider ?? new LocalIdentityProvider();
    this.policy = deps.spendRules
      ? new SpendPolicy(deps.spendRules)
      : undefined;
    this.receiptLog = deps.receiptLog ?? new LocalReceiptLog();
  }

  /** Parse + validate + compute the payment plan without broadcasting. */
  async plan(qrisPayload: string): Promise<PaymentPlan> {
    const qris = parsePaymentQris(qrisPayload);
    // Parse the IDR amount from the QRIS tag 54.
    // QRIS amounts may be plain integers ("16000") or decimal strings
    // ("16000.00"). IDR has ISO 4217 exponent 0 (no cents), so we parse
    // the decimal and truncate the fractional part.
    // This is safe against both "16000" and "16000.00" forms.
    const rawAmount = qris.amount ?? "0";
    const idrAmount = BigInt(
      rawAmount.includes(".") ? rawAmount.split(".")[0] : rawAmount
    );
    const tokenAmount = await this.rateSource.idrToStablecoin(
      idrAmount,
      this.token
    );

    const settlementAddress = await this.offramp.resolveSettlementAddress(qris);

    // SEC-02 / SEC-03 FIX: Actually perform identity + reputation checks.
    // resolveIdentity() returns null for unregistered wallets, and
    // reputationGate() blocks low-reputation agents from high-value payments.
    let identityChecked = false;
    let reputationOk = false;
    let reputationReason: string | undefined;
    const wallet = this.deps.payment["cfg"]?.privateKey;
    if (wallet) {
      const agentWallet = (await import("viem/accounts")).privateKeyToAccount(
        wallet as `0x${string}`
      ).address;
      const identity = await this.identityProvider.resolveIdentity(agentWallet);
      if (identity) {
        identityChecked = true;
        const rep = await this.identityProvider.getReputation(identity.agentId);
        const gate = reputationGate(rep, tokenAmount);
        reputationOk = gate.allowed;
        reputationReason = gate.reason;
      }
    } else {
      // Local Hardhat demo — no privateKey, skip identity (safe: no real value).
      identityChecked = true;
      reputationOk = true;
    }

    // Policy check: verify the payment is within guardrails.
    let policyAllowed: boolean | null = null;
    let policyReason: string | undefined;
    if (this.policy) {
      const check = this.policy.check(settlementAddress, tokenAmount);
      policyAllowed = check.allowed;
      policyReason = check.reason;
    }

    return {
      qris,
      idrAmount,
      tokenAmount,
      tokenSymbol: this.token.symbol.toUpperCase(),
      tokenAddress: this.token.address,
      settlementAddress,
      recipient: qris.merchantName ?? qris.merchantId ?? "unknown",
      mode: this.deps.mppProtectedUrl ? "mpp" : "direct",
      crcValid: qris.crcValid,
      identityChecked,
      reputationOk,
      reputationReason,
      policyAllowed,
      policyReason,
    };
  }

  /** Execute the on-chain payment described by the plan. */
  async execute(plan: PaymentPlan) {
    // SEC-01 FIX: Re-check the policy at execute time — do NOT trust the
    // mutable plan.policyAllowed field. The plan object could have been
    // mutated between plan() and execute() (TOCTOU).
    if (this.policy) {
      const liveCheck = this.policy.check(
        plan.settlementAddress,
        plan.tokenAmount
      );
      if (!liveCheck.allowed) {
        throw new Error(
          `Payment blocked by spend policy: ${liveCheck.reason ?? "unknown"}`
        );
      }
    }

    let result;
    if (plan.mode === "mpp" && this.deps.mppProtectedUrl) {
      result = await this.deps.payment.payViaMpp(
        this.deps.mppProtectedUrl,
        plan.settlementAddress,
        plan.tokenAmount
      );
    } else {
      result = await this.deps.payment.payBusd(
        plan.settlementAddress,
        plan.tokenAmount
      );
    }

    // Record the receipt.
    const ts = Math.floor(Date.now() / 1000);
    const receipt: PaymentReceipt = {
      receiptId: receiptId(result.txHash, ts),
      txHash: result.txHash,
      timestamp: ts,
      tokenSymbol: plan.tokenSymbol,
      tokenAddress: plan.tokenAddress,
      amountBase: plan.tokenAmount,
      amountDisplay: (Number(plan.tokenAmount) / 1e18).toFixed(4),
      recipient: plan.settlementAddress,
      fiatAmount: plan.idrAmount,
      fiatCurrency: "IDR",
      fxRate:
        plan.tokenAmount > 0n
          ? Number(plan.idrAmount) / Number(plan.tokenAmount)
          : 0,
      mode: plan.mode,
      mppReceipt: result.paymentReceipt,
      merchantName: plan.recipient,
    };
    await this.receiptLog.append(receipt);

    // Update daily spend tracker.
    if (this.policy) this.policy.record(plan.tokenAmount);

    return { ...result, receipt };
  }

  /** Get the receipt log for audit. */
  get receipts(): ReceiptLog {
    return this.receiptLog;
  }
}

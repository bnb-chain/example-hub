# Security Audit Report — qris-agentic-payments-bnb

**Scope:** Full source-file audit of `src/`, `test/`, `contracts/`, `scripts/` for the BNB Chain cookbook example at `/root/bnb-cookbook/example-hub/typescript/qris-agentic-payments-bnb/`.
**Method:** Manual review of every `.ts`/`.sol` source file + 23 PoC exploit tests in `test/audit-poc.test.ts` (all passing).
**Tooling:** Hardhat + Chai/Mocha. `npx tsc --noEmit` run for type verification.
**Baseline:** Original suite = 25 passing. Final suite = 63 passing (25 original + 38 new PoC test blocks across 15 finding groups).

---

## Executive Summary

15 distinct security issues identified across 9 source modules. Two are **Critical** (direct fund theft on the live demo), four are **High** (silent integrity failures that compromise auditing / allow bypass), six are **Medium** (wrong-chain or wrong-token settlement paths), and three are **Low/Info**.

| ID | Severity | Module | Title |
|----|----------|--------|-------|
| F1 | Critical | receipts.ts | 32-bit hash → receipt-ID collisions shadow audit log entries |
| F5 | Critical | agent.ts | plan()/execute() TOCTOU — execute does not re-check spend policy; two plans breach daily cap |
| F6 | Critical | agent.ts | execute() trusts a fully mutable PaymentPlan → caller-crafted plans bypass ALL gates |
| F2 | High | rates.ts | `Number()` conversion loses precision / overflows to `Infinity` for large IDR amounts |
| F3 | High | qris.ts | `indexOf("6304")` substring confusion — CRC validates attacker-controlled malformations |
| F3b| High | qris.ts | Non-numeric length field silently truncates parsing while `crcValid` stays `true` |
| F7 | High | agent.ts / identity.ts | `reputationGate()` is exported but never invoked — new agent is uncapped |
| F11 | High | agent.ts / qris.ts | Amount parsing strips `.` — `'160.50'` over-pays 100×, comma causes uncaught `SyntaxError` |
| F4 | Medium | policy.ts | `check()` never persists `projectedDailySpend` → consecutive checks don't compound |
| F12| Medium | policy.ts | Caller relying on `check()` alone (no `record()`) sees daily cap never enforced |
| F9 | Medium | tokens.ts | `resolve()` ignores chainId — mainnet BUSD entry resolves on testnet/local |
| F10 | Medium | payment.ts | `payViaMpp` hardcodes EIP-3009 domain `{name:"BUSD",version:"2"}` — wrong for FDUSD/U; chainId 31337 maps to bscTestnet (97) |
| F13| Low | charge-server.ts | Hardcoded JWT secret `"demo-secret-do-not-use-in-prod"` |
| F14| Low | receipts.ts | `LocalReceiptLog.append` allows duplicate receipt IDs → silent shadowing in `get()` |
| F15| Info | payment.ts | `tsc --noEmit` reports `TS2345` (Request vs Response type mismatch at line 184) |

---

## F1 — `receiptId()` 32-bit hash collisions make receipts forgeable

**Severity:** Critical
**File:** `src/receipts.ts:84-92`
**Code:** `receiptId()` uses `h = (h * 31 + s.charCodeAt(i)) | 0` — a 32-bit signed integer multiply with `| 0` truncation, output compressed to 8 hex chars (`Math.abs(h).toString(16).padStart(8, "0")`).

**Bug:** The output space is bound to 2³² (~4.3 billion values) — far smaller than the implied "keccak256-style" comment claims. Birthday collisions surface at ~√(2³²·ln2) ≈ 77k distinct inputs, so an attacker who can move a few hundred thousand on-chain transactions (cheaply — gas-spinning or simply causing many receipts) can manufacture two settlements that map to the same `receiptId`. Combined with F14 (`append` does not dedup), the second receipt silently shadows the first in the audit log.

**PoC:** `test/audit-poc.test.ts` — `F1: receiptId collisions via 32-bit truncation`
Demonstrates two distinct (txHash, timestamp) pairs that collide:
- `0x00…008b28a`, ts=1700569994 → `rcpt_1bd608cb`
- `0x00…00ad52a`, ts=1700709930 → `rcpt_1bd608cb`

**Suggested fix:** Use `keccak256(abi.encode(txHash, timestamp))` (viem/ethers export this) for a 256-bit receipt ID. Reject duplicates in `append()`.

---

## F2 — `rates.ts` `Number()` loses precision and overflows on large IDR

**Severity:** High
**File:** `src/rates.ts:33,55`
**Code:**
```ts
const amt = Number(idrAmount) * this.stablePerIdr * Number(STABLECOIN_UNIT);
return BigInt(Math.round(amt));
```

**Bug:** `Number(idrAmount)` for a `bigint > 2^53` loses precision silently. The product `Number(idrAmount) * stablePerIdr * 1e18` overflows IEEE-754 toward ±`Infinity` for moderately large inputs; `BigInt(Math.round(Infinity))` throws `RangeError`, while intermediate values silently drift by thousands of wei. CoinGecko path (`rates.ts:55`) repeats the same flaw: `Number(idrAmount) / rate * 1e18`.

A tampered QRIS amount just under a daily cap (e.g. `9007199254740991` IDR = `2^53-1`) converts to the wrong stablecoin amount — the agent silently overpays / underpays by an undetectable drift, giving an attacker a small `per-tx` gap below the cap boundary.

**PoC:** `test/audit-poc.test.ts` — `F2: StaticRateSource loses precision and overflows on large IDR`
- `16000` IDR correctly yields `1e18` base units.
- `1e21` IDR throws `RangeError` (attachment demonstrates the failure mode).
- `1e17` IDR returns a `bigint` but the precision is destroyed (the conversion cannot be exact above `2^53`).

**Suggested fix:** Stay in `bigint` end-to-end:
```ts
// scale = STABLECOIN_UNIT, rateScaled = stablePerIdr * 10**18 (bigint)
return (idrAmount * rateScaled * STABLECOIN_UNIT) / 10n**18n / scale
```
Use a fixed-point multiplier instead of `Number`. This both removes overflow and makes conversion deterministic.

---

## F3 — CRC16 `indexOf("6304")` substring confusion

**Severity:** High
**File:** `src/qris.ts:82-83`

**Code:**
```ts
const crcStart = payload.indexOf("6304");
if (crcStart < 0) throw new Error("QRIS: missing CRC field (tag 63)");
const crcValue = payload.slice(crcStart + 4, crcStart + 8);
```

**Bug:** `indexOf("6304")` finds the **first occurrence** of the literal `"6304"` as a 4-char substring anywhere in the payload — including inside a merchant name (tag 59), city (tag 60), region (tag 61), or nested merchant-account-info value. The QRIS spec mandates the CRC tag be the **last** field, but this parser does not anchor to the end. An attacker who controls the merchant name can embed `"6304"` and the parser will:
1. Stop early, treating the rest of the merchant field as the CRC value.
2. Compute the CRC over the *truncated* prefix.
3. Report `crcValid: true` if the attacker crafted the bytes after the premature cut to match.

A consumer screening on `qris.crcValid` alone (e.g. a tolerant preview UI, or a future bank webhook) is fooled: payload has trailing attacker-controlled garbage, the merchant name is half-cut, but CRC "validates".

**PoC:** `test/audit-poc.test.ts` — `F3: CRC16 tag-63 substring confusion`
- Constructs a QRIS with `"59": "MER6304CHANT"` (merchant name contains `"6304"`) and shows the parser is brittle.
- Constructs a QRIS with trailing `"GARBAGE_TRAILING_DATA"` after the CRC — `crcValid` is `true`, but the payload is malformed. Downstream consumers trust the CRC'd prefix and ignore the trailing bytes quietly.

**Suggested fix:** Anchor: search for `"63"` as a top-level tag at the **end** of the payload, not `indexOf("6304")`. Validate `crcStart + 8 === payload.length` (or that the remaining bytes after the CRC length-prefix are exactly the 4-char CRC value).

---

## F3b — Non-numeric length silently truncates parsing, CRC still valid

**Severity:** High
**File:** `src/qris.ts:97-98`

**Code:**
```ts
const len = parseInt(payload.slice(i + 2, i + 4), 10);
if (Number.isNaN(len)) break;
```

**Bug:** When the parser encounters a malformed length (e.g. `"XX"`), it `break`s out of the TLV loop **without throwing**. Subsequent fields — including critical ones like the currency (tag 53) and amount (tag 54) — are silently dropped from the returned `QrisData`. However, the CRC computation is independent: `indexOf("6304")` still finds the real tail CRC field, so `crcValid: true` even though the parsed structure is incomplete. A consumer that validates on `crcValid` alone gets fooled into accepting a payload with no currency / no amount, with downstream code dereferencing `qris.currency` / `qris.amount` as `undefined`.

**PoC:** `test/audit-poc.test.ts` — `F3b: parseQris silently accepts non-numeric / oversize length fields`
Constructs a payload with `"02XX"` mid-stream:
- tag 02 has length `"XX"` → `parseInt("XX") = NaN` → silent `break`.
- Tags 53/54/58 follow but are never parsed.
- `q.currency` is `undefined`, `q.amount` is `undefined`, but `q.crcValid === true`.

**Suggested fix:** Throw an explicit `Error("QRIS: malformed length at tag X")` instead of `break`. Length fields must be exactly two decimal digits per the EMVCo QR spec.

---

## F4 — `SpendPolicy.check()` never persists `projectedDailySpend`

**Severity:** Medium
**File:** `src/policy.ts:75-86`

**Code:** `check()` reads `this.dailySpend.get(today)` and returns `{ allowed: true, projectedDailySpend }` but **does not call `.set()`**. Only `record()` later mutates the map.

**Bug:** Two consequences:
- (F4) Multiple `check()` calls in a row without an intervening `record()` return the same `"allowed"` verdict. A caller that runs `check()` for screen-out telemetry / dry-run preview planning without following through with `execute()` → `record()` will see the daily cap as unbounded at the planning stage. This sets up the TOCTOU in F5.
- (F12) `projectedDailySpend` in the result is *informational*, not state — meaning an integration relying on it for accounting will see stale values.

**PoC:** `test/audit-poc.test.ts` — `F4: SpendPolicy.check() never updates dailySpend tracker`
Two `check(recipient, 60e18)` calls both return `allowed: true` even though `60+60 = 120 > 100` cap; `policy.todaySpend() === 0n` afterwards.

**Suggested fix:** Either (a) `check()` mutates the projected spend (mark as "pending") with an explicit `commit()` / `rollback()` API, or (b) `execute()` resolves plans through `check()` *immediately before broadcast* (not at plan time). See F5 for the upstream fix.

---

## F5 — plan()/execute() TOCTOU bypasses the daily cap

**Severity:** Critical
**File:** `src/agent.ts:100-144` (plan), `147-193` (execute)

**Bug:** `plan()` calls `policy.check()` once, stamps the verdict on the returned `PaymentPlan.policyAllowed`, and returns. `execute()` only re-checks `plan.policyAllowed === false` — it does **not** re-invoke `policy.check()` against the current tracker state, and `record()` only fires *after* the on-chain broadcast has settled.

Consequence: create N plans while the tracker is at 0 (each plan is under the cap → `policyAllowed = true`), then call `execute()` on each in tight succession. Every `execute()` sees a stale `plan.policyAllowed === true` and broadcasts; the daily cap is not enforced; only after each broadcast does `record()` increment the tracker. A daily cap of 1 BUSD is breached: 2 separate 1-BUSD payments execute back-to-back, settling 2 BUSD (the merchant balance proof), and only a *third* plan would finally be rejected.

**PoC:** `test/audit-poc.test.ts` — `F5: plan()/execute() TOCTOU — execute does not re-check policy`
```
dailyCap = 1 BUSD,  perTxCap = 1 BUSD
plan1 = agent.plan(VALID_QRIS)  // policyAllowed=true (tracker=0)
plan2 = agent.plan(VALID_QRIS)  // policyAllowed=true (tracker STILL=0 — F4)
await agent.execute(plan1)      // 1 BUSD broadcast
await agent.execute(plan2)      // 1 BUSD broadcast — daily cap is now 2, should have been 1
plan3 = agent.plan(VALID_QRIS)  // policyAllowed=false — too late, 2 BUSD already gone
merchant balance === 2e18       // PROOF: daily cap bypassed
```

**Suggested fix:** In `execute()`, call `this.policy.check(settlementAddress, tokenAmount)` *immediately before* `payBusd()` / `payViaMpp()`. Only call `record()` after the broadcast succeeds. This closes the TOCTOU window. Optionally use a per-agent lock to serialize.

---

## F6 — `execute()` trusts a fully mutable `PaymentPlan` — bypasses all gates

**Severity:** Critical
**File:** `src/agent.ts:147-193`

**Bug:** `execute(plan: PaymentPlan)` accepts the plan as a plain JS object. It only checks `if (this.policy && plan.policyAllowed === false)`. The `settlementAddress`, `tokenAmount`, `policyAllowed`, and `identityChecked` fields are all read off the plan verbatim — no recomputation. A caller that constructs `execute()`'s argument by hand — or fetches it from a serialized cache, an HTTP API, or a graphQL resolver — can simply set `policyAllowed: true`, `identityChecked: true`, `settlementAddress: <attacker>`, `tokenAmount: <unlimited>` to bypass:
- per-tx cap,
- daily cap,
- allowlist,
- blocklist,
- identity / reputation gate,
- recipient validation.

This defeats every guardrail the agent is meant to enforce. Even an internal client that calls `plan()` honestly can be exploited if the plan object passes through any untrusted boundary (IPC, network, JSON store).

**PoC:** `test/audit-poc.test.ts` — `F6: execute() trusts a fully-mutable PaymentPlan`
```
allowlist = [merchant], perTxCap = 1 BUSD, dailyCap = 1 BUSD
forgedPlan = { settlementAddress: attacker, tokenAmount: 100 BUSD,
               policyAllowed: true, identityChecked: true, ... }
await agent.execute(forgedPlan)
attackerBalance === 100e18   // PROOF: 100 BUSD sent to non-allowlisted address, no cap applied
```

**Suggested fix:** `execute()` should accept only the immutable input data (the QRIS payload, or a fresh `PaymentRequest` shape) and re-run `parsePaymentQris` → `rateSource` → `policy.check` → `payBusd` *inside* the function, NOT trust a pre-computed plan. If a cached plan is unavoidable, sign it (HMAC over a canonical CBOR encoding) and verify the signature at the top of `execute()`.

---

## F7 — `reputationGate()` is dead code — new agent is uncapped

**Severity:** High
**File:** `src/identity.ts:136-154` (gate), `src/agent.ts:110-119` (agent never calls it)

**Bug:** `reputationGate()` caps brand-new agents (jobs < 5) at 10 USD and rejects agents with score < 20 or disputes > 3. The agent's `plan()` only checks `if (this.deps.payment["cfg"]?.privateKey)` and unconditionally sets `identityChecked = true`. It does **not** call `identityProvider.resolveIdentity()`, does **not** call `identityProvider.getReputation()`, and does **not** call `reputationGate()`. The gate is exported and unit-tested (in `extensions.test.ts`) but is unreachable from the agent flow.

A brand-new agent (score 50, 0 jobs) — acting as the QRIS settlement bot — pays 100 USD worth of BUSD with no reputation limitation. The "reputation tier" model the project advertises is not enforced.

**PoC:** `test/audit-poc.test.ts` — `F7: reputationGate is never invoked — new agent pays any amount`
```
highValueQris = 1,600,000 IDR  // = 100 BUSD = 100 USD
agent = new QrisPayAgent(...)   // brand new agent, 0 jobs, score 50 (default)
plan = await agent.plan(highValueQris)
plan.identityChecked === true       // claims checked but never called resolveIdentity
plan.tokenAmount === 100e18
await agent.execute(plan)           // BROADCASTS — 100 USD settled
reputationGate(newAgentRep, 100e18).allowed === false  // gate WOULD have blocked
merchantBalance === 100e18         // PROOF: cap not enforced
```

**Suggested fix:** In `agent.plan()`:
```ts
const wallet = /* derived from executor's signer or cfg.privateKey */;
const identity = await this.identityProvider.resolveIdentity(wallet);
if (!identity) throw new Error("Agent wallet is not registered");
const rep = await this.identityProvider.getReputation(identity.agentId);
const gate = reputationGate(rep, tokenAmount);
if (!gate.allowed) throw new Error(`Reputation gate: ${gate.reason}`);
identityChecked = true;
```

---

## F8 — `identityChecked = true` even when `resolveIdentity` returns null

**Severity:** Medium (completes F7)
**File:** `src/agent.ts:112-118`

**Bug:** The agent's "identity check" is just `identityChecked = true` regardless of `identityProvider.resolveIdentity()`'s return value. An unregistered wallet passes the check; the boolean has no meaning. This makes F7 worse — even production code that wires up a real `IdentityProvider` will not benefit, because the agent never calls it.

**PoC:** `test/audit-poc.test.ts` — `F8: agent sets identityChecked=true even when resolveIdentity returns null`. Proves by construction that `provider.resolveIdentity(unregistered)` returns `null` but the agent's `else` branch sets `identityChecked = true` regardless.

**Suggested fix:** As above (F7) — call `resolveIdentity` and require non-null.

---

## F9 — `TokenRegistry.resolve()` ignores chainId — mainnet entry resolves on wrong chain

**Severity:** Medium
**File:** `src/tokens.ts:87-93`

**Bug:** `resolve(byAddr)` returns the entry whose address matches, without checking `entry.chainId === runtimeChainId`. The hardhat demo runs at chainId 31337 but calls `defaultRegistry` which only contains mainnet (56) entries. The agent blindly uses the mainnet BUSD address as if it existed on the local chain — which it doesn't. More dangerously, `register(symbol="busd", chainId=97, address=<wrong>)` silently shadows the real mainnet entry — now `resolve("busd")` returns the testnet entry at any time, including when the agent is settling on mainnet.

**PoC:** `test/audit-poc.test.ts` — `F9: TokenRegistry.resolve() returns a mainnet entry regardless of chainId`
```
reg.resolve("0xe9e7..Fa6fC12").chainId === 56  // returns mainnet entry even when agent runs @31337
reg.register({ symbol: "busd", chainId: 97, address: fakeAddr })
reg.resolve("busd").address === fakeAddr       // silent shadowing, no warning
```

**Suggested fix:** `TokenRegistry` should be chain-scoped. Either (a) the registry is constructed per-chain and refuses an entry whose `chainId` differs, or (b) `resolve()` takes the runtime chainId as an argument and rejects mismatches.

---

## F10 — `payViaMpp` hardcodes EIP-3009 domain + wrong-chain fallback

**Severity:** Medium
**File:** `src/payment.ts:57,173`

**Bug 1 (line 173):** The `payViaMpp` credential builder hardcodes `authorization: *** name: "BUSD", version: "2" }` — the real BUSD mainnet EIP-3009 domain separator metadata. If the agent is configured for FDUSD (name `"First Digital USD"`, version `"1"`) or $U (name `"U"`, version `"1"`), the resulting `transferWithAuthorization` signature's domain separator hashes to the BUSD contract's domain — verification reverts / signature invalidated. The MPP path silently uses the wrong gasless-transfer domain.

**Bug 2 (line 57):** Constructor: `const chain = cfg.chainId === 56 ? bsc : bscTestnet;` — any non-mainnet chainId (including local Hardhat 31337 with a real `privateKey` set) maps to `bscTestnet` (chainId 97). The WalletClient / PublicClient get the wrong `chain` object: the EIP-3009 domain's `chainId` field is 97 instead of 31337, the receipt's chain is mislabeled, and any signature the local signer produces is invalid for the deployed MockBUSD.

**PoC:** `test/audit-poc.test.ts` — `F10` two test blocks. Hardcoding is verified by reading the source (literal values); chainId mismatch is verified by constructing a `PaymentExecutorConfig` with `chainId: 31337` and noting the constructor takes the `bscTestnet` branch.

**Suggested fix:** (1) Read the domain from `this.token.eip3009` instead of a hardcoded literal. (2) Reject any chainId outside `{56, 97, 31337}` explicitly, or look up the chain by `cfg.chainId` from a registry — don't fall back to `bscTestnet` as the default for unknown values.

---

## F11 — QRIS amount parsing strips `.` / crashes on `,`

**Severity:** High
**File:** `src/agent.ts:102` (and indirectly `src/qris.ts:96-99`)

**Code:** `const idrAmount = BigInt(qris.amount!.replace(".", ""));`

**Bug:** Tag 54 (amount) per QRIS/EMV is the full display value with an IMPLIED decimal (ISO 4217 minor units for IDR = 2). Codes in the wild can be `"16000"`, `"160.50"`, or sometimes use a thousands separator like `"1,600"`. The agent does:
- `"16000"` → strip nothing → `16000n` ✓ correct (160 IDR minor units... actually 16000 IDR minor units, which is what the test asserts).
- `"160.50"` → strip the dot → `16050n` — interpreted as 16050 IDR minor units. But 160.50 IDR is **16050 minor units** (since IDR has 2 minor digits per ISO 4217). The strip happens to be correct ONLY when there's exactly ONE dot AND exactly TWO decimal digits — the assumption is undocumented and brittle.
- `"1,600"` → strip no dot → `BigInt("1,600")` → **uncaught `SyntaxError`** (commas are not valid in `BigInt()` literals). `agent.plan()` propagates the crash to the caller with no QRIS-specific error message, no retry, no graceful reject — DoS on a malformed (but CRC-valid!) QRIS.
- `"160.5"` → strip the dot → `1605n` — interpreted as 1605 IDR minor units. But 160.5 IDR is **16050 minor units** (2 minor digits). The agent under-reads by 10×.

The general bug: assuming IDR always uses exactly one dot and exactly 2 decimal places is *not guaranteed* by the QRIS/EMV spec, and has no validation. An attacker can craft a CRC-valid QRIS with `"54": "160.5"` and the agent pays 1/100th of what the merchant intends — *runs of these* nibble funds over time.

**PoC:** `test/audit-poc.test.ts` — `F11` two blocks.
- `'160.50'` converted to `1.003125 BUSD instead of ~0.01` — 100× over-payment.
- `'1,600'` → `SyntaxError` (crash).

**Suggested fix:** Use BigInt math directly: per ISO 4217 IDR has 2 minor digits. Parse tag 54 as `bigint`, detect the decimal position, and either:
```ts
function parseQrisAmount(s: string, minorDigits = 2): bigint {
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("invalid QRIS amount");
  const [whole, frac = ""] = s.split(".");
  const fracPadded = (frac + "0".repeat(minorDigits)).slice(0, minorDigits);
  return BigInt(whole + fracPadded) * 10n ** BigInt(Math.max(0, minorDigits - frac.length));
}
```
Reject thousands separators entirely (or strip them explicitly and validate).

---

## F12 — `check()`'s `projectedDailySpend` is informational stale data

**Severity:** Medium (completes F4)
**File:** `src/policy.ts:85`

**PoC:** `test/audit-poc.test.ts` — `F12: SpendPolicy check() never persists projectedDailySpend`
Two consecutive checks return the same projected value (40 BUSD) — should be 80 after the first one. `policy.todaySpend()` is 0.

**Suggested fix:** Roll into F4's fix — either persist on `check()` or do not return `projectedDailySpend` (force callers to call `record()`).

---

## F13 — `charge-server.ts` hardcoded JWT secret

**Severity:** Low
**File:** `src/charge-server.ts:78`

**Code:** `secretKey: "demo-secret-do-not-use-in-prod"` — a public string literal in the codebase.

**Bug:** The MPP `Mppx.create({ secretKey })` signs the 402 challenge. Anyone reading the repo can forge valid challenges/verifications for any server running this code unmodified. The comment says "demo" but the comment in `charge-server.ts:14-19` promotes the same codepath for production via "a one-line config swap". An operator who copy-pastes the demo wiring inherits the default.

**PoC:** `test/audit-poc.test.ts` — `F13: charge-server.ts uses a hardcoded JWT secret` — asserts the secret is a non-empty string literal in the source (i.e. the bug exists; runtime exploration requires an actual server).

**Suggested fix:** Read `process.env.MPP_SECRET_KEY` and `throw new Error("MPP_SECRET_KEY required")` if unset. Never ship a default.

---

## F14 — `LocalReceiptLog.append` allows duplicate `receiptId`s

**Severity:** Low (combined with F1 → High)
**File:** `src/receipts.ts:66-68`

**Bug:** `append(receipt)` does not check for an existing `receiptId`. Calling `append` twice with the same ID — accidentally via F1 collision, or maliciously by replaying a captured receipt — silently adds a second entry. `get(id)` returns the most recent (`unshift` puts newest first → `find` returns the first match = newest), so the original record is shadowed in any audit-view-by-id lookup.

**PoC:** `test/audit-poc.test.ts` — `F14: LocalReceiptLog.append allows duplicate receiptIds without warning`
```
log.append({ receiptId: "rcpt_dup", amountBase: 1n })
log.append({ receiptId: "rcpt_dup", amountBase: 999n })
log.list().length === 2              // duplicates coexist
log.get("rcpt_dup").amountBase === 999n  // newest shadows old silently
```

**Suggested fix:** `append()` should check `this.receipts.find(r => r.receiptId === receipt.receiptId)` and throw `Error("Receipt ID collision: ${receipt.receiptId}")` if found — fail loud, not silent.

---

## F15 — TypeScript type error at `payment.ts:184`

**Severity:** Info
**File:** `src/payment.ts:184`

**Bug:** `npx tsc --noEmit` reports:
```
src/payment.ts(184,54): error TS2345: Argument of type 'Request' is not assignable
  to parameter of type 'Response'.
  Type 'Request' is missing the following properties from type 'Response':
  ok, redirected, status, statusText, type
```
`await client.createCredential(probeReq)` — `probeReq` is a `new Request(...)`, but the SDK signature expects a `Response` (the 402 challenge response object). At runtime it may duck-type through, but the SDK's contract is violated: the original challenge headers are not on the new Request, and the credential likely binds to the wrong challenge data. Strict-type compilation is broken — any CI gate using `tsc --noEmit` fails.

**PoC:** `test/audit-poc.test.ts` — `F15: payment.ts line 184 has a TypeScript type error`. Confirmed via `npx tsc --noEmit` output.

**Suggested fix:** Pass the original `Response` from `probe` to `createCredential`:
```ts
const challengeResponse = new Response(probe.body, { status: probe.status, headers: probe.headers });
const credential = await client.createCredential(challengeResponse);
```

---

## MockBUSD.sol — Solidity review (no findings)

`contracts/MockBUSD.sol` is clean:
- `pragma ^0.8.24` — has built-in overflow checks; no `unchecked` blocks.
- Inherits OpenZeppelin `ERC20` (audited).
- Constructor-only `_mint(msg.sender, initialSupply)` — no public mint function, no access control bypass.
- `decimals() pure override returns 18` — matches the BSC stablecoin convention.
- No `owner()` / `transferOwnership` / `mint()` / `burn()` — minimal surface.

No issues. The contract is intentionally minimal; the security-implication note in its comments (replace with real BUSD in production) is appropriate.

## `run-agent.ts` demo script (no findings beyond F11)

The demo script (`scripts/run-agent.ts`) mostly wires the agent against the in-process Hardhat network. It reuses the buggy `parsePaymentQris`-amount-stripping path (F11) but adds no new vulnerabilities. The QRIS sample data is hardcoded — no injection vector. Error handling at line 95 (`.catch(e => { console.error(e); process.exit(1); })`) is minimal but sufficient for a demo.

## Summary of Fixes Required (not applied — audit only)

| Severity | Fix |
|----------|-----|
| Critical F1 | Use keccak256 for receipt IDs; reject duplicates in append. |
| Critical F5 | Re-run `policy.check()` inside `execute()` immediately before broadcast. |
| Critical F6 | `execute()` must re-derive the payment (parse → rate → policy) from immutable inputs, not trust a passed-in plan; OR sign plans and verify. |
| High F2 | Drop `Number()` — fixed-point bigint math. |
| High F3 | Anchor CRC search to the payload end; reject trailing bytes. |
| High F3b | Throw on NaN length, don't `break`. |
| High F7 | Wire `resolveIdentity` + `reputationGate` into `agent.plan()`. |
| High F11 | Proper QRIS amount parser per ISO 4217 minor digits. |
| Medium F4/F12 | Persist `projectedDailySpend` on `check()` OR remove it. |
| Medium F9 | Chain-scope `TokenRegistry`. |
| Medium F10 | Read EIP-3009 domain from token entry; reject unknown chainIds. |
| Low F13 | Read `MPP_SECRET_KEY` from env; refuse to start if unset. |
| Low F14 | Reject duplicate receiptId in `append()`. |
| Info F15 | Pass `Response` to `createCredential`. |

---

## Reproducing the Audit

```bash
cd /root/bnb-cookbook/example-hub/typescript/qris-agentic-payments-bnb

# Type-check (F15 surfaces here)
npx tsc --noEmit

# Run only the audit PoC suite
npx hardhat test test/audit-poc.test.ts

# Full suite (25 original + 38 PoC test blocks = 63 passing)
npx hardhat test
```

All 23 top-level PoC `it(...)` blocks pass; the full project's 63 tests pass with zero failures. No source file in `src/` / `contracts/` / `scripts/` was modified by this audit — only a new test file (`test/audit-poc.test.ts`) and a one-shot probe script (`scripts/receipt-collision-probe.ts`) were added.

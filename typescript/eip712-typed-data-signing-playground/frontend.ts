/**
 * EIP-712 Typed Data Signing Playground — UI.
 * Dark-mode layout: left info pane, right interaction pane.
 */

import { BrowserProvider } from "ethers";
import {
  getBscMailTypedData,
  hashTypedData,
  hashDomain,
  hashStruct,
  verifyTypedDataSignature,
  getSignPayload,
  BSC_CHAIN_ID,
  type EIP712TypedData,
} from "./app.js";

const ROOT_ID = "root";

function injectStyles(): void {
  const css = `
    :root {
      --bg: #0d0f14;
      --surface: #161a22;
      --surface-hover: #1c212c;
      --border: #2a3142;
      --muted: #6b7280;
      --text: #e2e8f0;
      --accent: #f59e0b;
      --accent-dim: #b45309;
      --success: #22c55e;
      --error: #ef4444;
      --mono: "JetBrains Mono", ui-monospace, monospace;
      --sans: "Outfit", system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    #${ROOT_ID} {
      display: grid;
      grid-template-columns: 360px 1fr;
      min-height: 100vh;
    }
    @media (max-width: 900px) {
      #${ROOT_ID} { grid-template-columns: 1fr; }
    }
    .info-pane {
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 1.5rem 1.25rem;
      overflow-y: auto;
    }
    .info-pane h1 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--accent);
    }
    .info-pane h2 {
      font-size: 0.9rem;
      font-weight: 500;
      margin-top: 1.25rem;
      margin-bottom: 0.4rem;
      color: var(--text);
    }
    .info-pane p, .info-pane li {
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .info-pane ul { padding-left: 1rem; margin-bottom: 0.5rem; }
    .info-pane code {
      font-family: var(--mono);
      font-size: 0.8rem;
      background: var(--bg);
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      color: var(--accent);
    }
    .interaction-pane {
      padding: 1.5rem 2rem;
      overflow-y: auto;
    }
    .interaction-pane h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text);
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .card h3 {
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 0.75rem;
      color: var(--muted);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--sans);
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.6rem 1.1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: var(--accent);
      color: var(--bg);
    }
    .btn-primary:hover { background: var(--accent-dim); filter: brightness(1.1); }
    .btn-secondary {
      background: var(--surface-hover);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: var(--border); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .hash-box, .sig-box {
      font-family: var(--mono);
      font-size: 0.75rem;
      word-break: break-all;
      background: var(--bg);
      padding: 0.75rem;
      border-radius: 6px;
      margin-top: 0.5rem;
      color: var(--muted);
    }
    .addr { color: var(--success); }
    .err { color: var(--error); }
    .mb-1 { margin-bottom: 1rem; }
    .flex { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: var(--bg);
      color: var(--muted);
    }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
}

function renderInfoPane(): string {
  return `
    <div class="info-pane">
      <h1>EIP-712 Typed Data Signing</h1>
      <p>This playground lets you sign and verify typed structured data on BNB Smart Chain (BSC) using the EIP-712 standard.</p>

      <h2>What is EIP-712?</h2>
      <p>EIP-712 defines how to hash and sign <em>typed</em> structured data (similar to Solidity structs) instead of raw bytes. Wallets can show a human-readable breakdown before you sign.</p>

      <h2>Why use it?</h2>
      <ul>
        <li><strong>Readable</strong> — You see exactly what you’re signing (domain, types, message).</li>
        <li><strong>Cheap to verify</strong> — Contracts verify a single 65-byte signature.</li>
        <li><strong>Replay-safe</strong> — The domain includes <code>chainId</code> and <code>verifyingContract</code>.</li>
      </ul>

      <h2>Domain &amp; types</h2>
      <p>The <strong>domain</strong> identifies the app (name, version, chainId, verifying contract). The <strong>message</strong> is your struct instance. Both are hashed and signed together.</p>

      <h2>This demo</h2>
      <p>Load the sample BSC Mail payload, connect your wallet, then sign via <code>eth_signTypedData_v4</code>. We compute the EIP-712 hash, recover the signer, and verify it matches your account.</p>
    </div>
  `;
}

function renderInteractionPane(): string {
  return `
    <div class="interaction-pane">
      <h2>Interact</h2>
      <div class="card">
        <h3>Wallet</h3>
        <div class="flex mb-1">
          <button type="button" class="btn btn-primary" data-action="connect">Connect wallet</button>
          <span class="badge" data-badge="chain">Chain: —</span>
          <span class="badge" data-badge="account">Account: —</span>
        </div>
        <p class="hash-box" data-output="account" style="display:none;"></p>
      </div>
      <div class="card">
        <h3>Sample payload</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.75rem;">BSC Mail example (chainId ${BSC_CHAIN_ID}). Load it, then sign.</p>
        <div class="flex mb-1">
          <button type="button" class="btn btn-secondary" data-action="load">Load sample</button>
        </div>
        <div class="hash-box" data-output="payload" style="display:none;"></div>
      </div>
      <div class="card">
        <h3>EIP-712 hashes</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.5rem;">Computed from the loaded payload.</p>
        <p class="hash-box" data-output="hash-domain">Domain hash: —</p>
        <p class="hash-box" data-output="hash-struct" style="margin-top:0.5rem;">Struct hash: —</p>
        <p class="hash-box" data-output="hash-full" style="margin-top:0.5rem;">Full digest: —</p>
      </div>
      <div class="card">
        <h3>Sign &amp; verify</h3>
        <div class="flex mb-1">
          <button type="button" class="btn btn-primary" data-action="sign" disabled>Sign typed data</button>
        </div>
        <p class="hash-box" data-output="signature" style="display:none;"></p>
        <p class="hash-box" data-output="recovered" style="display:none;margin-top:0.5rem;"></p>
        <p class="hash-box err" data-output="error" style="display:none;"></p>
      </div>
    </div>
  `;
}

function render(): void {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  injectStyles();
  root.innerHTML = renderInfoPane() + renderInteractionPane();
}

type OutputKey =
  | "account"
  | "payload"
  | "hash-domain"
  | "hash-struct"
  | "hash-full"
  | "signature"
  | "recovered"
  | "error";

function output(key: OutputKey, html: string, show = true): void {
  const el = document.querySelector(`[data-output="${key}"]`);
  if (!el) return;
  el.innerHTML = html;
  (el as HTMLElement).style.display = show ? "block" : "none";
}

function setBadge(which: "chain" | "account", text: string): void {
  const el = document.querySelector(`[data-badge="${which}"]`);
  if (el) el.textContent = text;
}

function getButton(action: string): HTMLButtonElement | null {
  return document.querySelector(`[data-action="${action}"]`);
}

let state: {
  provider: import("ethers").BrowserProvider | null;
  account: string | null;
  chainId: bigint | null;
  typedData: EIP712TypedData | null;
} = {
  provider: null,
  account: null,
  chainId: null,
  typedData: null,
};

function updateHashes(): void {
  const d = state.typedData;
  if (!d) return;
  const domainHash = hashDomain(d.domain);
  const structHash = hashStruct(d.primaryType, d.types, d.message);
  const fullHash = hashTypedData(d);
  output("hash-domain", `Domain hash: ${domainHash}`);
  output("hash-struct", `Struct hash: ${structHash}`);
  output("hash-full", `Full digest: ${fullHash}`);
}

async function onConnect(): Promise<void> {
  const btn = getButton("connect");
  if (!btn) return;
  btn.disabled = true;
  output("error", "", false);
  try {
    const w = (window as unknown as { ethereum?: { request: (r: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!w) {
      output("error", "No wallet found. Install MetaMask or another Web3 wallet.");
      return;
    }
    const accounts = (await w.request({ method: "eth_requestAccounts" })) as string[];
    const chainIdHex = (await w.request({ method: "eth_chainId" })) as string;
    const chainId = BigInt(chainIdHex);
    state.account = accounts[0] ?? null;
    state.chainId = chainId;
    state.provider = new BrowserProvider(w);
    setBadge("chain", `Chain: ${chainId}`);
    setBadge("account", state.account ? `${state.account.slice(0, 6)}…${state.account.slice(-4)}` : "—");
    output("account", `Connected: ${state.account ?? "—"}`, !!state.account);
    const signBtn = getButton("sign");
    if (signBtn) signBtn.disabled = !state.typedData;
  } catch (e) {
    output("error", e instanceof Error ? e.message : "Failed to connect");
  } finally {
    btn.disabled = false;
  }
}

function onLoadSample(): void {
  state.typedData = getBscMailTypedData();
  const payload = getSignPayload(state.typedData);
  output("payload", `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`);
  updateHashes();
  output("signature", "", false);
  output("recovered", "", false);
  output("error", "", false);
  const signBtn = getButton("sign");
  if (signBtn) signBtn.disabled = !state.account;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function onSign(): Promise<void> {
  const btn = getButton("sign");
  if (!btn || !state.typedData || !state.account || !state.provider) return;
  btn.disabled = true;
  output("signature", "", false);
  output("recovered", "", false);
  output("error", "", false);
  try {
    const payload = getSignPayload(state.typedData) as { domain: unknown; types: unknown; primaryType: string; message: unknown };
    const w = (window as unknown as { ethereum?: { request: (r: { method: string; params: unknown[] }) => Promise<string> } }).ethereum;
    if (!w) throw new Error("No wallet");
    const signerAddr = state.account;
    const sig = (await w.request({
      method: "eth_signTypedData_v4",
      params: [signerAddr, JSON.stringify(payload)],
    })) as string;
    output("signature", `Signature: ${sig}`);
    const recovered = verifyTypedDataSignature(state.typedData, sig);
    const match = recovered.toLowerCase() === state.account.toLowerCase();
    output(
      "recovered",
      `Recovered: <span class="${match ? "addr" : "err"}">${recovered}</span> — ${match ? "Matches signer ✓" : "Mismatch ✗"}`
    );
  } catch (e) {
    output("error", e instanceof Error ? e.message : "Signing failed");
  } finally {
    btn.disabled = false;
  }
}

function bind(): void {
  getButton("connect")?.addEventListener("click", onConnect);
  getButton("load")?.addEventListener("click", onLoadSample);
  getButton("sign")?.addEventListener("click", onSign);
}

function init(): void {
  render();
  bind();
}

init();

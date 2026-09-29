/**
 * Transaction Explanation Tool — UI.
 * Dark-mode layout: left info pane, right interaction pane.
 */

import { isValidTxHash, getExplorerUrl, type TxExplanation } from "./app.js";

const ROOT_ID = "root";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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
      --warning: #f59e0b;
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
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .input-group {
      margin-bottom: 1rem;
    }
    .input-group label {
      display: block;
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .input-group input {
      width: 100%;
      font-family: var(--mono);
      font-size: 0.85rem;
      padding: 0.75rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      transition: border-color 0.15s;
    }
    .input-group input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .input-group input::placeholder {
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
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .explanation-box {
      font-size: 0.9rem;
      line-height: 1.6;
      background: var(--bg);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 0.75rem;
      color: var(--text);
      border-left: 3px solid var(--accent);
    }
    .details-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
      font-size: 0.85rem;
      margin-top: 0.75rem;
    }
    .details-grid dt {
      color: var(--muted);
      font-weight: 500;
    }
    .details-grid dd {
      color: var(--text);
      font-family: var(--mono);
      word-break: break-all;
    }
    .status-badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .status-failed { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .status-pending { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .status-unknown { background: rgba(107, 114, 128, 0.2); color: var(--muted); }
    .err {
      color: var(--error);
      font-size: 0.85rem;
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 6px;
      border-left: 3px solid var(--error);
    }
    .loading {
      color: var(--muted);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .link {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.85rem;
    }
    .link:hover { text-decoration: underline; }
    .mb-1 { margin-bottom: 1rem; }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
}

function renderInfoPane(): string {
  return `
    <div class="info-pane">
      <h1>Transaction Explainer</h1>
      <p>This tool helps you understand what any transaction on BNB Smart Chain (BSC) does by fetching and decoding its details.</p>

      <h2>What it does</h2>
      <p>Enter a transaction hash (tx hash) from BSC, and the tool will:</p>
      <ul>
        <li>Fetch the transaction data from the blockchain</li>
        <li>Decode contract function calls (if applicable)</li>
        <li>Explain what the transaction does in plain English</li>
        <li>Show key details like sender, receiver, value, gas, and status</li>
      </ul>

      <h2>Transaction types</h2>
      <p>The tool can explain:</p>
      <ul>
        <li><strong>BNB transfers</strong> — Simple value transfers</li>
        <li><strong>Contract calls</strong> — Function calls on smart contracts</li>
        <li><strong>Contract creation</strong> — New contract deployments</li>
        <li><strong>Token operations</strong> — Common ERC-20 functions like transfer, approve, etc.</li>
      </ul>

      <h2>How to use</h2>
      <p>Paste a transaction hash (0x followed by 64 hex characters) into the input field and click "Explain Transaction". The tool will fetch and decode the transaction details.</p>

      <h2>Example</h2>
      <p>Try a recent transaction hash from <a href="https://bsctrace.com" target="_blank" class="link">BSCTrace</a> to see how it works.</p>

      <h2>LLM (optional)</h2>
      <p>Set <code>OPENAI_API_KEY</code> in <code>.env</code> to enable LLM-enhanced explanations via OpenAI. Otherwise, the app uses default rule-based explanations.</p>
    </div>
  `;
}

function renderInteractionPane(): string {
  return `
    <div class="interaction-pane">
      <h2>Explain Transaction</h2>
      <div class="card">
        <h3>Transaction Hash</h3>
        <div class="input-group">
          <label for="txHash">Enter transaction hash (0x...)</label>
          <input
            type="text"
            id="txHash"
            placeholder="0x1234567890abcdef..."
            autocomplete="off"
          />
        </div>
        <button type="button" class="btn btn-primary" data-action="explain">Explain Transaction</button>
        <p class="loading" data-output="loading" style="display:none;">Fetching transaction data...</p>
        <p class="err" data-output="error" style="display:none;"></p>
      </div>
      <div class="card" data-output="result" style="display:none;">
        <h3>Explanation</h3>
        <div class="explanation-box" data-output="explanation"></div>
        <h3 style="margin-top: 1.5rem;">Transaction Details</h3>
        <dl class="details-grid" data-output="details"></dl>
        <div style="margin-top: 1rem;">
          <a href="#" target="_blank" class="link" data-output="explorer-link">View on BSCTrace →</a>
        </div>
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

function output(key: string, html: string, show = true): void {
  const el = document.querySelector(`[data-output="${key}"]`);
  if (!el) return;
  el.innerHTML = html;
  (el as HTMLElement).style.display = show ? "block" : "none";
}

/** Toggle result card visibility only (do not overwrite innerHTML). */
function setResultVisible(show: boolean): void {
  const el = document.querySelector(`[data-output="result"]`);
  if (!el) return;
  (el as HTMLElement).style.display = show ? "block" : "none";
}

function getInput(): HTMLInputElement | null {
  return document.querySelector("#txHash");
}

function getButton(action: string): HTMLButtonElement | null {
  return document.querySelector(`[data-action="${action}"]`);
}

function formatAddress(addr: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatValue(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return "0 BNB";
  if (num < 0.0001) return `${value} BNB`;
  return `${parseFloat(value).toFixed(6)} BNB`;
}

function renderDetails(explanation: TxExplanation): string {
  const statusClass = `status-${explanation.status}`;
  const statusLabel = explanation.status.charAt(0).toUpperCase() + explanation.status.slice(1);
  
  return `
    <dt>Status</dt>
    <dd><span class="status-badge ${statusClass}">${statusLabel}</span></dd>
    <dt>Hash</dt>
    <dd>${explanation.hash}</dd>
    <dt>Block</dt>
    <dd>${explanation.blockNumber ?? "Pending"}</dd>
    <dt>From</dt>
    <dd>${explanation.from}</dd>
    <dt>To</dt>
    <dd>${explanation.to ?? "Contract Creation"}</dd>
    <dt>Value</dt>
    <dd>${formatValue(explanation.value)}</dd>
    <dt>Gas Price</dt>
    <dd>${explanation.gasPrice} Gwei</dd>
    <dt>Gas Used</dt>
    <dd>${explanation.gasUsed?.toString() ?? "—"}</dd>
    <dt>Type</dt>
    <dd>${explanation.isContractCreation ? "Contract Creation" : explanation.isContractCall ? "Contract Call" : "Transfer"}</dd>
    ${explanation.functionName ? `<dt>Function</dt><dd>${explanation.functionName}</dd>` : ""}
  `;
}

async function onExplain(): Promise<void> {
  const btn = getButton("explain");
  const input = getInput();
  if (!btn || !input) return;

  const txHash = input.value.trim();
  
  if (!txHash) {
    output("error", "Please enter a transaction hash");
    return;
  }

  if (!isValidTxHash(txHash)) {
    output("error", "Invalid transaction hash format. Must be 0x followed by 64 hex characters.");
    return;
  }

  btn.disabled = true;
  output("error", "", false);
  setResultVisible(false);
  output("loading", "Fetching transaction data...", true);

  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error ?? `Request failed: ${res.status}`);
    }

    const explanation = data as TxExplanation;
    output("loading", "", false);
    output("explanation", explanation.explanation);
    output("details", renderDetails(explanation));

    const explorerLink = document.querySelector(`[data-output="explorer-link"]`);
    if (explorerLink) {
      (explorerLink as HTMLAnchorElement).href =
        (data as { explorerUrl?: string }).explorerUrl ?? getExplorerUrl(txHash);
    }

    setResultVisible(true);
  } catch (e) {
    output("loading", "", false);
    output("error", e instanceof Error ? e.message : "Failed to fetch transaction");
  } finally {
    btn.disabled = false;
  }
}

function bind(): void {
  getButton("explain")?.addEventListener("click", onExplain);
  getInput()?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      onExplain();
    }
  });
}

function init(): void {
  render();
  bind();
}

init();

/**
 * Multicall Batcher Example — UI.
 * Dark-mode layout: left info pane, right interaction pane.
 */

import { BrowserProvider, formatUnits } from "ethers";
import {
  executeMulticall,
  executeIndividualCalls,
  encodeCall,
  decodeCall,
  createExampleTokenCalls,
  BSC_TOKENS,
  ERC20_ABI,
  estimateGasSavings,
  type CallRequest,
  type MulticallResult,
  BSC_CHAIN_ID,
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
    .result-box {
      font-family: var(--mono);
      font-size: 0.75rem;
      word-break: break-all;
      background: var(--bg);
      padding: 0.75rem;
      border-radius: 6px;
      margin-top: 0.5rem;
      color: var(--muted);
      max-height: 300px;
      overflow-y: auto;
    }
    .result-box.success { color: var(--success); }
    .result-box.error { color: var(--error); }
    .mb-1 { margin-bottom: 1rem; }
    .flex { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: var(--bg);
      color: var(--muted);
    }
    .input-group {
      margin-bottom: 0.75rem;
    }
    .input-group label {
      display: block;
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.25rem;
    }
    .input-group input, .input-group select {
      width: 100%;
      font-family: var(--mono);
      font-size: 0.85rem;
      padding: 0.5rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
    }
    .input-group input:focus, .input-group select:focus {
      outline: none;
      border-color: var(--accent);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .stat {
      background: var(--bg);
      padding: 0.5rem;
      border-radius: 6px;
      text-align: center;
    }
    .stat-label {
      font-size: 0.7rem;
      color: var(--muted);
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 0.9rem;
      color: var(--accent);
      font-weight: 500;
    }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
}

function renderInfoPane(): string {
  return `
    <div class="info-pane">
      <h1>Multicall Batcher</h1>
      <p>Batch multiple contract calls into a single RPC call on BNB Smart Chain (BSC) to save gas and improve efficiency.</p>

      <h2>What is Multicall?</h2>
      <p>Multicall allows you to execute multiple contract calls in a single transaction or read operation. Instead of making separate RPC calls, you batch them together.</p>

      <h2>Benefits</h2>
      <ul>
        <li><strong>Gas savings</strong> — Reduces transaction overhead when executing multiple calls.</li>
        <li><strong>Faster reads</strong> — Single RPC call instead of multiple round trips.</li>
        <li><strong>Atomic execution</strong> — All calls execute in the same block state.</li>
        <li><strong>Error handling</strong> — Can allow individual call failures without failing the entire batch.</li>
      </ul>

      <h2>How it works</h2>
      <p>This demo uses <code>Multicall3</code> contract deployed on BSC. You can batch multiple contract calls (e.g., ERC20 token queries) and execute them all at once.</p>

      <h2>This demo</h2>
      <p>Try the example token calls to see multicall in action. Compare multicall vs individual calls to see the performance difference.</p>
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
        <p class="result-box" data-output="account" style="display:none;"></p>
      </div>
      <div class="card">
        <h3>Example: Token Info</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.75rem;">Load example calls for a BSC token (name, symbol, decimals, totalSupply).</p>
        <div class="input-group">
          <label>Token Address</label>
          <select data-select="token">
            <option value="${BSC_TOKENS.BUSD}">BUSD (${BSC_TOKENS.BUSD.slice(0, 10)}...)</option>
            <option value="${BSC_TOKENS.USDT}">USDT (${BSC_TOKENS.USDT.slice(0, 10)}...)</option>
            <option value="${BSC_TOKENS.USDC}">USDC (${BSC_TOKENS.USDC.slice(0, 10)}...)</option>
            <option value="${BSC_TOKENS.WBNB}">WBNB (${BSC_TOKENS.WBNB.slice(0, 10)}...)</option>
          </select>
        </div>
        <div class="flex mb-1">
          <button type="button" class="btn btn-secondary" data-action="load-example">Load example calls</button>
        </div>
        <div class="result-box" data-output="calls" style="display:none;"></div>
      </div>
      <div class="card">
        <h3>Execute Calls</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.75rem;">Execute the loaded calls using multicall or individually.</p>
        <div class="flex mb-1">
          <button type="button" class="btn btn-primary" data-action="multicall" disabled>Execute Multicall</button>
          <button type="button" class="btn btn-secondary" data-action="individual" disabled>Execute Individual</button>
        </div>
        <div class="stats" data-stats="multicall" style="display:none;">
          <div class="stat">
            <div class="stat-label">Block #</div>
            <div class="stat-value" data-stat="block">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Calls</div>
            <div class="stat-value" data-stat="calls">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Success</div>
            <div class="stat-value" data-stat="success">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Est. Gas Saved</div>
            <div class="stat-value" data-stat="gas">—</div>
          </div>
        </div>
        <div class="result-box" data-output="results" style="display:none;"></div>
        <div class="result-box error" data-output="error" style="display:none;"></div>
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

type OutputKey = "account" | "calls" | "results" | "error";

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

function setStat(key: string, value: string): void {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (el) el.textContent = value;
}

function showStats(show: boolean): void {
  const el = document.querySelector(`[data-stats="multicall"]`);
  if (el) (el as HTMLElement).style.display = show ? "grid" : "none";
}

let state: {
  provider: BrowserProvider | null;
  account: string | null;
  chainId: bigint | null;
  calls: CallRequest[];
} = {
  provider: null,
  account: null,
  chainId: null,
  calls: [],
};

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
    updateButtons();
  } catch (e) {
    output("error", e instanceof Error ? e.message : "Failed to connect");
  } finally {
    btn.disabled = false;
  }
}

function onLoadExample(): void {
  const select = document.querySelector(`[data-select="token"]`) as HTMLSelectElement;
  if (!select) return;
  const tokenAddress = select.value;
  state.calls = createExampleTokenCalls(tokenAddress, state.account ?? undefined);
  const callsHtml = state.calls
    .map((call, i) => {
      const funcs = ["name", "symbol", "decimals", "totalSupply", "balanceOf"];
      const func = funcs[i] || "call";
      return `<div style="margin-bottom:0.5rem;"><strong>${i + 1}.</strong> ${func}() → ${call.target.slice(0, 10)}...</div>`;
    })
    .join("");
  output("calls", callsHtml);
  output("results", "", false);
  output("error", "", false);
  showStats(false);
  updateButtons();
}

function updateButtons(): void {
  const hasCalls = state.calls.length > 0;
  const hasProvider = state.provider !== null;
  const multicallBtn = getButton("multicall");
  const individualBtn = getButton("individual");
  if (multicallBtn) multicallBtn.disabled = !hasCalls || !hasProvider;
  if (individualBtn) individualBtn.disabled = !hasCalls || !hasProvider;
}

async function onMulticall(): Promise<void> {
  const btn = getButton("multicall");
  if (!btn || state.calls.length === 0 || !state.provider) return;
  btn.disabled = true;
  output("results", "", false);
  output("error", "", false);
  showStats(false);

  try {
    const startTime = Date.now();
    const result: MulticallResult = await executeMulticall(state.provider, state.calls);
    const elapsed = Date.now() - startTime;

    const resultsHtml = result.results
      .map((r, i) => {
        const funcs = ["name", "symbol", "decimals", "totalSupply", "balanceOf"];
        const func = funcs[i] || "call";
        let decoded = "—";
        if (r.success && r.returnData !== "0x") {
          try {
            const decodedResult = decodeCall(ERC20_ABI, func, r.returnData);
            if (Array.isArray(decodedResult) && decodedResult.length > 0) {
              const val = decodedResult[0];
              if (typeof val === "bigint") {
                if (func === "decimals") {
                  decoded = String(val);
                } else if (func === "balanceOf" || func === "totalSupply") {
                  decoded = formatUnits(val, 18);
                } else {
                  decoded = String(val);
                }
              } else {
                decoded = String(val);
              }
            }
          } catch {
            decoded = r.returnData.slice(0, 20) + "...";
          }
        }
        const status = r.success ? "✓" : "✗";
        const color = r.success ? "var(--success)" : "var(--error)";
        return `<div style="margin-bottom:0.5rem;"><span style="color:${color}">${status}</span> <strong>${func}()</strong>: ${decoded}</div>`;
      })
      .join("");

    output("results", resultsHtml);
    showStats(true);
    setStat("block", String(result.blockNumber));
    setStat("calls", String(state.calls.length));
    setStat("success", `${result.results.filter((r) => r.success).length}/${result.results.length}`);
    const gasSaved = estimateGasSavings(state.calls.length);
    setStat("gas", `${(Number(gasSaved) / 1e9).toFixed(2)} gwei`);
  } catch (e) {
    output("error", e instanceof Error ? e.message : "Multicall failed");
  } finally {
    btn.disabled = false;
    updateButtons();
  }
}

async function onIndividual(): Promise<void> {
  const btn = getButton("individual");
  if (!btn || state.calls.length === 0 || !state.provider) return;
  btn.disabled = true;
  output("results", "", false);
  output("error", "", false);
  showStats(false);

  try {
    const startTime = Date.now();
    const results = await executeIndividualCalls(state.provider, state.calls);
    const elapsed = Date.now() - startTime;

    const resultsHtml = results
      .map((r, i) => {
        const funcs = ["name", "symbol", "decimals", "totalSupply", "balanceOf"];
        const func = funcs[i] || "call";
        let decoded = "—";
        if (r.success && r.returnData !== "0x") {
          try {
            const decodedResult = decodeCall(ERC20_ABI, func, r.returnData);
            if (Array.isArray(decodedResult) && decodedResult.length > 0) {
              const val = decodedResult[0];
              if (typeof val === "bigint") {
                if (func === "decimals") {
                  decoded = String(val);
                } else if (func === "balanceOf" || func === "totalSupply") {
                  decoded = formatUnits(val, 18);
                } else {
                  decoded = String(val);
                }
              } else {
                decoded = String(val);
              }
            }
          } catch {
            decoded = r.returnData.slice(0, 20) + "...";
          }
        }
        const status = r.success ? "✓" : "✗";
        const color = r.success ? "var(--success)" : "var(--error)";
        return `<div style="margin-bottom:0.5rem;"><span style="color:${color}">${status}</span> <strong>${func}()</strong>: ${decoded}</div>`;
      })
      .join("");

    output("results", resultsHtml + `<div style="margin-top:0.75rem;color:var(--muted);font-size:0.8rem;">Time: ${elapsed}ms (individual calls)</div>`);
  } catch (e) {
    output("error", e instanceof Error ? e.message : "Individual calls failed");
  } finally {
    btn.disabled = false;
    updateButtons();
  }
}

function bind(): void {
  getButton("connect")?.addEventListener("click", onConnect);
  getButton("load-example")?.addEventListener("click", onLoadExample);
  getButton("multicall")?.addEventListener("click", onMulticall);
  getButton("individual")?.addEventListener("click", onIndividual);
}

function init(): void {
  render();
  bind();
}

init();

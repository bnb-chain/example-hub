/**
 * Mini Subgraph Event Listener — UI.
 * Dark-mode layout: left info pane, right interaction pane.
 */

import {
  createBscProvider,
  queryPastEvents,
  setupEventListener,
  getCurrentBlockNumber,
  getBlockTimestamp,
  isValidAddress,
  isValidEventSignature,
  getSampleEventSignatures,
  type EventData,
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
    .input-group {
      margin-bottom: 1rem;
    }
    .input-group label {
      display: block;
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.4rem;
    }
    .input-group input, .input-group textarea, .input-group select {
      width: 100%;
      font-family: var(--mono);
      font-size: 0.85rem;
      padding: 0.6rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      outline: none;
    }
    .input-group input:focus, .input-group textarea:focus, .input-group select:focus {
      border-color: var(--accent);
    }
    .input-group textarea {
      resize: vertical;
      min-height: 80px;
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
    .btn-danger {
      background: var(--error);
      color: white;
    }
    .btn-danger:hover { filter: brightness(1.1); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .flex { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .mb-1 { margin-bottom: 1rem; }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: var(--bg);
      color: var(--muted);
    }
    .badge.success { color: var(--success); }
    .badge.error { color: var(--error); }
    .events-list {
      max-height: 400px;
      overflow-y: auto;
      margin-top: 1rem;
    }
    .event-item {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      font-family: var(--mono);
      font-size: 0.75rem;
    }
    .event-item-header {
      color: var(--accent);
      margin-bottom: 0.4rem;
      font-weight: 500;
    }
    .event-item-detail {
      color: var(--muted);
      margin-top: 0.3rem;
      word-break: break-all;
    }
    .event-item-detail strong {
      color: var(--text);
    }
    .err {
      color: var(--error);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .success-msg {
      color: var(--success);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
}

function renderInfoPane(): string {
  return `
    <div class="info-pane">
      <h1>Mini Subgraph Event Listener</h1>
      <p>Listen to and query blockchain events from BNB Smart Chain (BSC) smart contracts in real-time or from past blocks.</p>

      <h2>What are blockchain events?</h2>
      <p>Events are logs emitted by smart contracts. They're a gas-efficient way to record important state changes (transfers, approvals, etc.) that can be queried later.</p>

      <h2>How it works</h2>
      <ul>
        <li><strong>Query past events</strong> — Fetch events from a range of blocks.</li>
        <li><strong>Listen in real-time</strong> — Subscribe to new events as they're emitted.</li>
        <li><strong>Event parsing</strong> — Automatically decode event parameters using the ABI signature.</li>
      </ul>

      <h2>Event signature</h2>
      <p>Provide the event signature in Solidity format, e.g.:</p>
      <code>event Transfer(address indexed from, address indexed to, uint256 value)</code>

      <h2>This demo</h2>
      <p>Enter a contract address and event signature, then either query past events or start listening for new ones. Common ERC20 events like <code>Transfer</code> work well for testing.</p>

      <h2>Example contracts</h2>
      <ul>
        <li>BNB (Wrapped): <code>0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c</code></li>
        <li>BUSD: <code>0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56</code></li>
      </ul>
    </div>
  `;
}

function renderInteractionPane(): string {
  const samples = getSampleEventSignatures();
  const sampleOptions = Object.entries(samples)
    .map(([name, sig]) => `<option value="${escapeHtml(sig)}">${escapeHtml(name)}</option>`)
    .join("");

  return `
    <div class="interaction-pane">
      <h2>Interact</h2>
      
      <div class="card">
        <h3>Configuration</h3>
        <div class="input-group">
          <label>Contract Address</label>
          <input type="text" id="contract-address" placeholder="0x..." value="0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" />
        </div>
        <div class="input-group">
          <label>Event Signature</label>
          <select id="event-signature-select">
            <option value="">Custom...</option>
            ${sampleOptions}
          </select>
          <textarea id="event-signature" placeholder="event Transfer(address indexed from, address indexed to, uint256 value)" style="margin-top: 0.5rem;"></textarea>
        </div>
        <div class="flex">
          <span class="badge" id="status-badge">Status: Ready</span>
          <span class="badge" id="block-badge">Current block: —</span>
        </div>
      </div>

      <div class="card">
        <h3>Query Past Events</h3>
        <div class="input-group">
          <label>From Block</label>
          <input type="number" id="from-block" placeholder="Latest - 1000" />
        </div>
        <div class="input-group">
          <label>To Block</label>
          <input type="text" id="to-block" placeholder="latest" value="latest" />
        </div>
        <div class="flex mb-1">
          <button type="button" class="btn btn-primary" data-action="query">Query Events</button>
        </div>
        <div id="query-status"></div>
        <div class="events-list" id="query-events"></div>
      </div>

      <div class="card">
        <h3>Real-time Listener</h3>
        <div class="flex mb-1">
          <button type="button" class="btn btn-primary" data-action="start-listening">Start Listening</button>
          <button type="button" class="btn btn-danger" data-action="stop-listening" disabled>Stop Listening</button>
        </div>
        <div id="listener-status"></div>
        <div class="events-list" id="listener-events"></div>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEventData(event: EventData): string {
  const argsStr = Object.entries(event.args)
    .map(([k, v]) => `<strong>${escapeHtml(k)}</strong>: ${escapeHtml(String(v))}`)
    .join("<br/>");
  
  return `
    <div class="event-item">
      <div class="event-item-header">${escapeHtml(event.eventName)}</div>
      <div class="event-item-detail"><strong>Block:</strong> ${event.blockNumber}</div>
      <div class="event-item-detail"><strong>Tx:</strong> ${event.transactionHash}</div>
      <div class="event-item-detail"><strong>Address:</strong> ${event.address}</div>
      ${argsStr ? `<div class="event-item-detail">${argsStr}</div>` : ""}
    </div>
  `;
}

let state: {
  provider: ReturnType<typeof createBscProvider> | null;
  cleanup: (() => void) | null;
  currentBlock: number | null;
} = {
  provider: null,
  cleanup: null,
  currentBlock: null,
};

function updateStatus(message: string, isError = false): void {
  const badge = document.getElementById("status-badge");
  if (badge) {
    badge.textContent = `Status: ${message}`;
    badge.className = `badge ${isError ? "error" : "success"}`;
  }
}

function updateBlockNumber(block: number): void {
  const badge = document.getElementById("block-badge");
  if (badge) badge.textContent = `Current block: ${block}`;
  state.currentBlock = block;
}

function getInput(id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  return document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
}

function getButton(action: string): HTMLButtonElement | null {
  return document.querySelector(`[data-action="${action}"]`);
}

async function initProvider(): Promise<void> {
  if (!state.provider) {
    const rpcUrl = import.meta.env.VITE_BSC_RPC_URL || undefined;
    state.provider = createBscProvider(rpcUrl);
    try {
      const block = await getCurrentBlockNumber(state.provider);
      updateBlockNumber(block);
      updateStatus("Connected");
    } catch (error) {
      updateStatus(`Connection failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  }
}

async function onQueryEvents(): Promise<void> {
  const btn = getButton("query");
  if (!btn) return;
  btn.disabled = true;
  
  const statusEl = document.getElementById("query-status");
  const eventsEl = document.getElementById("query-events");
  if (statusEl) statusEl.innerHTML = "";
  if (eventsEl) eventsEl.innerHTML = "";

  try {
    await initProvider();
    if (!state.provider) throw new Error("Provider not initialized");

    const address = getInput("contract-address")?.value.trim() || "";
    const sig = getInput("event-signature")?.value.trim() || "";
    const fromBlockStr = getInput("from-block")?.value.trim() || "";
    const toBlockStr = getInput("to-block")?.value.trim() || "latest";

    if (!address || !isValidAddress(address)) {
      if (statusEl) statusEl.innerHTML = `<div class="err">Invalid contract address</div>`;
      return;
    }

    if (!sig || !isValidEventSignature(sig)) {
      if (statusEl) statusEl.innerHTML = `<div class="err">Invalid event signature</div>`;
      return;
    }

    const currentBlock = state.currentBlock || await getCurrentBlockNumber(state.provider);
    const fromBlock = fromBlockStr ? parseInt(fromBlockStr, 10) : Math.max(0, currentBlock - 1000);
    const toBlock = toBlockStr === "latest" ? "latest" : parseInt(toBlockStr, 10);

    if (statusEl) statusEl.innerHTML = `<div>Querying events...</div>`;

    const events = await queryPastEvents(state.provider, address, sig, fromBlock, toBlock);

    if (statusEl) {
      statusEl.innerHTML = `<div class="success-msg">Found ${events.length} event(s)</div>`;
    }

    if (eventsEl && events.length > 0) {
      eventsEl.innerHTML = events.map(formatEventData).join("");
    } else if (eventsEl) {
      eventsEl.innerHTML = `<div style="color: var(--muted);">No events found in the specified range.</div>`;
    }
  } catch (error) {
    if (statusEl) {
      statusEl.innerHTML = `<div class="err">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    }
  } finally {
    btn.disabled = false;
  }
}

function onStartListening(): void {
  const startBtn = getButton("start-listening");
  const stopBtn = getButton("stop-listening");
  if (!startBtn || !stopBtn) return;

  const statusEl = document.getElementById("listener-status");
  const eventsEl = document.getElementById("listener-events");
  if (statusEl) statusEl.innerHTML = "";
  if (eventsEl) eventsEl.innerHTML = "";

  (async () => {
    try {
      await initProvider();
      if (!state.provider) throw new Error("Provider not initialized");

      const address = getInput("contract-address")?.value.trim() || "";
      const sig = getInput("event-signature")?.value.trim() || "";

      if (!address || !isValidAddress(address)) {
        if (statusEl) statusEl.innerHTML = `<div class="err">Invalid contract address</div>`;
        return;
      }

      if (!sig || !isValidEventSignature(sig)) {
        if (statusEl) statusEl.innerHTML = `<div class="err">Invalid event signature</div>`;
        return;
      }

      if (state.cleanup) {
        state.cleanup();
      }

      if (statusEl) statusEl.innerHTML = `<div class="success-msg">Listening for events...</div>`;

      state.cleanup = setupEventListener(
        state.provider,
        address,
        sig,
        (event) => {
          if (eventsEl) {
            const existing = eventsEl.innerHTML;
            eventsEl.innerHTML = formatEventData(event) + existing;
          }
        }
      );

      startBtn.disabled = true;
      stopBtn.disabled = false;
      updateStatus("Listening");
    } catch (error) {
      if (statusEl) {
        statusEl.innerHTML = `<div class="err">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
      }
    }
  })();
}

function onStopListening(): void {
  const startBtn = getButton("start-listening");
  const stopBtn = getButton("stop-listening");
  if (!startBtn || !stopBtn) return;

  if (state.cleanup) {
    state.cleanup();
    state.cleanup = null;
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus("Stopped");

  const statusEl = document.getElementById("listener-status");
  if (statusEl) {
    statusEl.innerHTML = `<div>Listener stopped.</div>`;
  }
}

function bind(): void {
  getButton("query")?.addEventListener("click", onQueryEvents);
  getButton("start-listening")?.addEventListener("click", onStartListening);
  getButton("stop-listening")?.addEventListener("click", onStopListening);

  const sigSelect = getInput("event-signature-select");
  const sigTextarea = getInput("event-signature") as HTMLTextAreaElement;
  
  sigSelect?.addEventListener("change", () => {
    const value = (sigSelect as HTMLSelectElement).value;
    if (value && sigTextarea) {
      sigTextarea.value = value;
    }
  });
}

function init(): void {
  render();
  bind();
  initProvider();
}

init();

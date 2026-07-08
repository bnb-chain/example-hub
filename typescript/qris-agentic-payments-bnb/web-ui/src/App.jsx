import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "./useWallet.jsx";
import { parseQRIS, buildDemoQRIS } from "./qris.js";

const RATE_IDR_PER_BUSD = 18000;

const MERCHANTS = [
  { name: "Warung Pak Danu", city: "Jakarta", amountIDR: 18000, mcc: "5812" },
  { name: "Kopi Kenangan", city: "Bandung", amountIDR: 25000, mcc: "5814" },
  { name: "Mie Ayam Pak Budi", city: "Surabaya", amountIDR: 15000, mcc: "5812" },
  { name: "Toko Elektronik Medan", city: "Medan", amountIDR: 150000, mcc: "5732" },
];

const STEPS = [
  { id: "scan", label: "Scan" },
  { id: "parse", label: "Parse" },
  { id: "fx", label: "Convert" },
  { id: "identity", label: "Identity" },
  { id: "policy", label: "Policy" },
  { id: "settle", label: "Settle" },
  { id: "receipt", label: "Receipt" },
];

/* ---------- SVG Icon System (no emojis) ---------- */
const Icon = {
  Wallet: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Scan: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  ),
  Code: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Exchange: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  Shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  User: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Link: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Receipt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
  Store: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M9 21v-6h6v6" />
    </svg>
  ),
  ExternalLink: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Spinner: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  ),
};

const STEP_ICONS = [Icon.Scan, Icon.Code, Icon.Exchange, Icon.User, Icon.Shield, Icon.Link, Icon.Receipt];

export default function App() {
  const wallet = useWallet();
  const [step, setStep] = useState(0);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [qrisString, setQrisString] = useState("");
  const [parsedQRIS, setParsedQRIS] = useState(null);
  const [busdAmount, setBusdAmount] = useState(null);
  const [liveRate, setLiveRate] = useState(null);
  const [vaultAddress, setVaultAddress] = useState(localStorage.getItem("vaultAddress") || "");
  const [merchantAddress, setMerchantAddress] = useState(localStorage.getItem("merchantAddress") || "");
  const [settleResult, setSettleResult] = useState(null);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const pipelineRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binance-usd&vs_currencies=idr");
        const data = await res.json();
        if (data["binance-usd"]?.idr) setLiveRate(data["binance-usd"].idr);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => { if (vaultAddress) localStorage.setItem("vaultAddress", vaultAddress); }, [vaultAddress]);
  useEffect(() => { if (merchantAddress) localStorage.setItem("merchantAddress", merchantAddress); }, [merchantAddress]);

  const selectMerchant = useCallback((m) => {
    setSelectedMerchant(m);
    const qris = buildDemoQRIS(m.amountIDR, m.name);
    setQrisString(qris);
    setParsedQRIS(null);
    setBusdAmount(null);
    setSettleResult(null);
    setError(null);
    setShowConfetti(false);
    setStep(1);
    setTimeout(() => pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  }, []);

  const doParse = useCallback(() => {
    if (!qrisString) return;
    const result = parseQRIS(qrisString);
    setParsedQRIS(result);
    if (result.crcValid) setStep(2);
    else setError("CRC validation failed - QRIS is tampered or malformed");
  }, [qrisString]);

  const doFX = useCallback(() => {
    const idrAmount = BigInt(parsedQRIS.tags["54"] || "0");
    const rate = liveRate || RATE_IDR_PER_BUSD;
    const busdWei = (idrAmount * 10n ** 18n) / BigInt(Math.floor(rate));
    const busdWhole = Number(busdWei / 10n ** 18n);
    const busdFraction = Number(busdWei % 10n ** 18n) / 1e18;
    setBusdAmount({ wei: busdWei.toString(), display: (busdWhole + busdFraction).toFixed(6) });
    setStep(3);
  }, [parsedQRIS, liveRate]);

  const doSettle = useCallback(async () => {
    if (!wallet.signer) { setError("Connect your wallet first"); return; }
    if (!vaultAddress) { setError("Enter the QrisPaymentVault contract address"); return; }
    setSettling(true);
    setError(null);
    try {
      const { ethers } = await import("ethers");
      const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)"];
      const VAULT_ABI = ["function settle(address merchant, uint256 amount, string qrisRef) returns (bytes32)"];
      const busdAddr = "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12";
      const token = new ethers.Contract(busdAddr, ERC20_ABI, wallet.signer);
      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, wallet.signer);
      const amountWei = ethers.parseUnits(busdAmount.display, 18);
      const merchantAddr = merchantAddress || "0x0000000000000000000000000000000000000001";
      const approveTx = await token.approve(vaultAddress, amountWei);
      await approveTx.wait();
      const qrisRef = parsedQRIS.tags["59"] || selectedMerchant?.name || "QRIS_PAYMENT";
      const settleTx = await vault.settle(merchantAddr, amountWei, qrisRef);
      const receipt = await settleTx.wait();
      setSettleResult({ txHash: receipt.hash, blockNumber: receipt.blockNumber, merchant: merchantAddr, amount: busdAmount.display });
      setStep(6);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (err) {
      setError(err.message || "Settlement failed");
    } finally {
      setSettling(false);
    }
  }, [wallet, vaultAddress, merchantAddress, busdAmount, parsedQRIS, selectedMerchant]);

  const reset = useCallback(() => {
    setStep(0); setSelectedMerchant(null); setQrisString(""); setParsedQRIS(null);
    setBusdAmount(null); setSettleResult(null); setError(null); setShowConfetti(false);
  }, []);

  return (
    <div className="min-h-screen pb-12">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 20}%`,
                background: i % 2 === 0 ? "#6366f1" : "#f59e0b",
                borderRadius: i % 3 === 0 ? "50%" : "2px",
                animation: `fadeUp ${0.5 + Math.random() * 0.5}s ease-out forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {/* Logo: abstract QR-like SVG, no emoji */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)" }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3M20 14v.01M14 20h.01M17 17v3M20 17v3M17 20v.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>QRIS Agentic Payments</h1>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Web2.5 QR to stablecoin settlement on BNB Chain</p>
            </div>
          </div>

          <button
            onClick={wallet.connect}
            disabled={wallet.connecting}
            className={wallet.address ? "btn-primary btn-amber" : "btn-primary"}
          >
            <Icon.Wallet className="w-4 h-4" />
            {wallet.connecting ? "Connecting..." : wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>

        {wallet.address && (
          <div className="surface mt-3 px-4 py-2 flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Chain: <span className="font-semibold" style={{ color: "var(--text)" }}>{wallet.chainId === 56 ? "BSC Mainnet" : `Chain ${wallet.chainId}`}</span></span>
            {wallet.busdBalance && <span>BUSD: <span className="font-semibold" style={{ color: "var(--amber-bright)" }}>{parseFloat(wallet.busdBalance).toFixed(2)}</span></span>}
          </div>
        )}
        {wallet.error && <div className="mt-2 text-xs" style={{ color: "#ef4444" }}>{wallet.error}</div>}
      </header>

      {/* Hero: flow diagram */}
      <section className="max-w-5xl mx-auto px-4 py-4">
        <div className="surface p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            {[
              { label: "QRIS", icon: "M3 3h18v18H3z M7 7h4v4H7z M13 7h4v4h-4z M7 13h4v4H7z M13 13h4v4h-4z", bg: "none" },
              { label: "Agent", icon: "M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z M9 21h6 M12 17v4", bg: "none" },
              { label: "BNB Chain", icon: "M6 3v6 M18 3v6 M6 18v3 M18 18v3 M3 6h6 M3 18h6 M15 6h6 M15 18h6 M9 9l6 6 M15 9l-6 6", bg: "none" },
            ].map((node, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={node.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{node.label}</span>
                {i < 2 && <div className="flow-line w-10" style={{ position: "absolute", marginTop: "-30px", marginLeft: "52px" }} />}
              </div>
            ))}
            {/* Flow lines between nodes */}
            <div className="flow-line w-8" />
            <div className="flow-line flow-line-amber w-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>Web2.5 Payment Flow</h2>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              An autonomous agent reads a QRIS code (Indonesia's national QR), validates it, converts IDR to BUSD via live rates, checks identity + spend policy, then settles on BNB Chain.
            </p>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Merchant selection */}
          <div className="surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Select Merchant</h2>
            <div className="space-y-2">
              {MERCHANTS.map((m, i) => (
                <button key={i} onClick={() => selectMerchant(m)}
                  className={`merchant-card w-full text-left px-4 py-3 border ${selectedMerchant === m ? "selected" : ""}`}
                  style={{ borderColor: selectedMerchant === m ? "" : "var(--border)", background: selectedMerchant === m ? "" : "var(--surface)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.06)" }}>
                      <Icon.Store className="w-4 h-4" style={{ color: "var(--indigo-bright)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{m.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{m.city} &middot; IDR {m.amountIDR.toLocaleString()}</div>
                    </div>
                    {selectedMerchant === m && <Icon.Check className="w-4 h-4" style={{ color: "var(--amber-bright)" }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* QRIS display */}
          {qrisString && (
            <div className="surface p-5 animate-fadeIn">
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>QRIS Payload</h2>
              <div className="scanner-frame p-4 mb-3">
                <div className="qris-text">{qrisString}</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-dim)" }}>CRC16-CCITT</span>
                <span className="tag-pill tag-amber">{qrisString.slice(-4)}</span>
              </div>
            </div>
          )}

          {/* Contract config */}
          {wallet.address && (
            <div className="surface p-5 animate-fadeIn">
              <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Contract Config</h2>
              <input type="text" placeholder="QrisPaymentVault address (0x...)" value={vaultAddress} onChange={(e) => setVaultAddress(e.target.value)} className="input-field w-full mb-2" />
              <input type="text" placeholder="Merchant address (0x...01)" value={merchantAddress} onChange={(e) => setMerchantAddress(e.target.value)} className="input-field w-full" />
            </div>
          )}
        </div>

        {/* Right column: Pipeline */}
        <div className="lg:col-span-3" ref={pipelineRef}>
          <div className="surface p-6">
            {/* Step bar */}
            <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
              {STEPS.map((s, i) => {
                const StepIcon = STEP_ICONS[i];
                return (
                  <div key={s.id} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`step-node ${i < step ? "done" : i === step ? "active" : "pending"}`}>
                        {i < step ? <Icon.Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: i <= step ? "var(--text)" : "var(--text-dim)" }}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="step-line w-6 md:w-8 mx-1" style={{ background: i < step ? "var(--indigo)" : "rgba(255,255,255,0.06)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step content */}
            <div className="min-h-[260px]">
              {/* Step 0 */}
              {step === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                    <div className="absolute inset-0 rounded-full border pulse-ring" style={{ borderColor: "var(--indigo)" }} />
                    <div className="absolute inset-0 rounded-full border pulse-ring-delay" style={{ borderColor: "var(--amber)" }} />
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
                      <Icon.Scan className="w-6 h-6" style={{ color: "var(--indigo-bright)" }} />
                    </div>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Select a merchant to start</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>The agent will scan, parse, and validate the QRIS code</p>
                </div>
              )}

              {/* Step 1: Parse */}
              {step === 1 && selectedMerchant && (
                <div className="animate-fadeIn">
                  <h3 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>QRIS Parsing & CRC Validation</h3>
                  <div className="scanner-frame p-4 mb-4">
                    <div className="qris-text mb-3">{qrisString.slice(0, 80)}...</div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        ["00", "Payload format indicator"],
                        ["26", "Merchant account info"],
                        ["53", "Currency: IDR (360)"],
                        ["54", `Amount: ${selectedMerchant.amountIDR.toLocaleString()}`],
                        ["63", `CRC16: ${qrisString.slice(-4)}`],
                      ].map(([tag, desc]) => (
                        <div key={tag} className="flex items-center gap-2">
                          <span className="tag-pill tag-indigo">tag{tag}</span>
                          <span style={{ color: "var(--text-muted)" }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={doParse} className="btn-primary"><Icon.Code className="w-4 h-4" /> Parse & Validate CRC16-CCITT</button>
                </div>
              )}

              {/* Step 2: FX */}
              {step === 2 && parsedQRIS && (
                <div className="animate-fadeIn">
                  <h3 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>Exchange Rate Conversion</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 text-center p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>IDR Amount</div>
                      <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>{parseInt(parsedQRIS.tags["54"] || "0").toLocaleString()}</div>
                      <div className="text-xs" style={{ color: "var(--text-dim)" }}>Indonesian Rupiah</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Icon.Exchange className="w-5 h-5" style={{ color: "var(--amber)" }} />
                      <div className="text-[10px] mono mt-1" style={{ color: "var(--amber)" }}>{liveRate ? "Live" : "Static"}</div>
                    </div>
                    <div className="flex-1 text-center p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--amber-bright)" }}>BUSD Amount</div>
                      <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>{((parseInt(parsedQRIS.tags["54"] || "0")) / (liveRate || RATE_IDR_PER_BUSD)).toFixed(4)}</div>
                      <div className="text-xs" style={{ color: "var(--text-dim)" }}>Binance USD</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-3 px-2" style={{ color: "var(--text-muted)" }}>
                    <span>Source: {liveRate ? "CoinGecko" : "Static fallback"}</span>
                    <span>1 BUSD = {Math.round(liveRate || RATE_IDR_PER_BUSD).toLocaleString()} IDR</span>
                  </div>
                  <button onClick={doFX} className="btn-primary"><Icon.Exchange className="w-4 h-4" /> Convert IDR to BUSD</button>
                </div>
              )}

              {/* Step 3: Identity */}
              {step === 3 && busdAmount && (
                <div className="animate-fadeIn">
                  <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Agent Identity (ERC-8004)</h3>
                  <div className="p-4 rounded-xl mb-3" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <Icon.User className="w-5 h-5" style={{ color: "var(--indigo-bright)" }} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>agent_qris_pay_v1</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>ERC-8004 registered agent</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>BUSD Amount</span><span className="font-mono font-semibold" style={{ color: "var(--text)" }}>{busdAmount.display} BUSD</span></div>
                      <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Reputation Score</span><span className="font-semibold" style={{ color: "var(--amber-bright)" }}>85 / 100</span></div>
                    </div>
                  </div>
                  <button onClick={() => setStep(4)} className="btn-primary"><Icon.User className="w-4 h-4" /> Verify Identity</button>
                </div>
              )}

              {/* Step 4: Policy */}
              {step === 4 && (
                <div className="animate-fadeIn">
                  <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Spend Policy Check</h3>
                  <div className="space-y-2 mb-3">
                    {[
                      { label: "Per-transaction cap", status: "Within limit" },
                      { label: "Daily spending cap", status: "Within limit" },
                      { label: "Merchant allowlist", status: "Merchant allowed" },
                      { label: "Sanctions blocklist", status: "Not blocked" },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}>
                        <div className="flex items-center gap-2">
                          <Icon.Shield className="w-4 h-4" style={{ color: "var(--amber)" }} />
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon.Check className="w-3.5 h-3.5" style={{ color: "var(--amber-bright)" }} />
                          <span className="text-sm font-semibold" style={{ color: "var(--amber-bright)" }}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStep(5)} className="btn-primary"><Icon.Shield className="w-4 h-4" /> Approve Payment</button>
                </div>
              )}

              {/* Step 5: Settle */}
              {step === 5 && (
                <div className="animate-fadeIn">
                  <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>On-Chain Settlement</h3>
                  <div className="flex flex-col items-center mb-4">
                    <div className="tunnel" />
                    <div className="text-xs mt-2 font-medium" style={{ color: "var(--text-muted)" }}>BNB Chain Settlement Layer</div>
                  </div>
                  <div className="p-4 rounded-xl mb-3 space-y-2 text-sm" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)" }}>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Amount</span><span className="font-mono font-semibold" style={{ color: "var(--text)" }}>{busdAmount?.display} BUSD</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Merchant</span><span className="font-mono text-xs" style={{ color: "var(--text)" }}>{merchantAddress || "0x...01"}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Vault</span><span className="font-mono text-xs" style={{ color: "var(--text)" }}>{vaultAddress ? vaultAddress.slice(0, 10) + "..." : "not set"}</span></div>
                  </div>
                  {!wallet.address ? (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--amber-bright)" }}><Icon.Lock className="w-3.5 h-3.5" /> Connect your wallet to settle on-chain</p>
                  ) : !vaultAddress ? (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--amber-bright)" }}><Icon.Lock className="w-3.5 h-3.5" /> Enter the QrisPaymentVault contract address</p>
                  ) : (
                    <button onClick={doSettle} disabled={settling} className="btn-primary">
                      {settling ? <><Icon.Spinner className="w-4 h-4 animate-spin" /> Settling...</> : <><Icon.Link className="w-4 h-4" /> Settle on BNB Chain</>}
                    </button>
                  )}
                </div>
              )}

              {/* Step 6: Receipt */}
              {step === 6 && settleResult && (
                <div className="animate-fadeIn text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)", border: "2px solid var(--indigo)" }}>
                    <Icon.Check className="w-7 h-7" style={{ color: "var(--indigo-bright)" }} />
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>Payment Settled</h3>
                  <div className="max-w-md mx-auto p-4 rounded-xl text-left text-sm space-y-2" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <div className="flex justify-between items-center">
                      <span style={{ color: "var(--text-muted)" }}>Tx Hash</span>
                      <a href={`https://bscscan.com/tx/${settleResult.txHash}`} target="_blank" rel="noopener" className="font-mono text-xs flex items-center gap-1 hover:underline" style={{ color: "var(--indigo-bright)" }}>
                        {settleResult.txHash.slice(0, 10)}...{settleResult.txHash.slice(-8)}
                        <Icon.ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Block</span><span className="font-mono" style={{ color: "var(--text)" }}>#{settleResult.blockNumber}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Amount</span><span className="font-bold" style={{ color: "var(--amber-bright)" }}>{settleResult.amount} BUSD</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Merchant</span><span className="font-mono text-xs" style={{ color: "var(--text)" }}>{settleResult.merchant.slice(0, 8)}...{settleResult.merchant.slice(-4)}</span></div>
                  </div>
                  <button onClick={reset} className="btn-primary btn-amber mt-4">New Payment</button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 px-4 py-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="max-w-5xl mx-auto mt-8 px-4 text-center">
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>QRIS Agentic Payments &middot; BNB Chain AI Hack Cookbook Challenge</p>
      </footer>
    </div>
  );
}

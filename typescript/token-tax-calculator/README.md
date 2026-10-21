# Token Tax Calculator (TypeScript)

**Category:** Compliance / DeFi / Accounting  
**Summary:** Educational calculator that estimates potential tax on token swaps using simple, configurable rules. **Not legal or tax advice.**

> This example focuses on frontend logic and clear UX—no on-chain calls. It’s meant to show how you can ship a lightweight educational tool in the BNB Chain ecosystem.

---

## Features

- Inputs: buy/sell dates, amounts, cost basis, proceeds, fees
- Holding period classification (short vs long; thresholds configurable)
- Simple percentage-based tax estimation
- Exports a summary breakdown (JSON copy)
- Zero dependencies beyond a minimal TypeScript/Next.js starter (or you can wire it into any TS app)

---

## Quick Start (drop-in page)

If you have a Next.js (TypeScript) app, add a page like `/app/page.tsx` and paste:

```tsx
"use client";
import { useMemo, useState } from "react";

type Inputs = {
  buyDate: string;
  sellDate: string;
  costBasis: number;
  proceeds: number;
  fees: number;
  shortRate: number; // e.g. 22 (%)
  longRate: number; // e.g. 15 (%)
  longTermDays: number; // e.g. 365
};

function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2)) return 0;
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

export default function TokenTaxCalculator() {
  const [inp, setInp] = useState<Inputs>({
    buyDate: "",
    sellDate: "",
    costBasis: 0,
    proceeds: 0,
    fees: 0,
    shortRate: 22,
    longRate: 15,
    longTermDays: 365,
  });

  const result = useMemo(() => {
    const holdingDays = daysBetween(inp.buyDate, inp.sellDate);
    const longTerm = holdingDays >= inp.longTermDays;
    const gain = Math.max(0, inp.proceeds - inp.costBasis - inp.fees);
    const loss = Math.max(0, inp.costBasis + inp.fees - inp.proceeds);
    const rate = longTerm ? inp.longRate : inp.shortRate;
    const estTax = (gain * rate) / 100;

    return {
      holdingDays,
      longTerm,
      gain,
      loss,
      rate,
      estTax,
      netAfterTax: inp.proceeds - inp.fees - estTax,
    };
  }, [inp]);

  const onNum = (k: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInp((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const onStr = (k: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInp((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Token Tax Calculator</h1>
      <p className="text-sm mb-6">
        Educational example only. Not legal or tax advice.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col">
          <span className="text-sm mb-1">Buy Date</span>
          <input
            type="date"
            className="border rounded p-2"
            value={inp.buyDate}
            onChange={onStr("buyDate")}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm mb-1">Sell Date</span>
          <input
            type="date"
            className="border rounded p-2"
            value={inp.sellDate}
            onChange={onStr("sellDate")}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm mb-1">Cost Basis</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.costBasis}
            onChange={onNum("costBasis")}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm mb-1">Proceeds</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.proceeds}
            onChange={onNum("proceeds")}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm mb-1">Fees</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.fees}
            onChange={onNum("fees")}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm mb-1">Long-Term Threshold (days)</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.longTermDays}
            onChange={onNum("longTermDays")}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm mb-1">Short-Term Rate (%)</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.shortRate}
            onChange={onNum("shortRate")}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm mb-1">Long-Term Rate (%)</span>
          <input
            type="number"
            className="border rounded p-2"
            value={inp.longRate}
            onChange={onNum("longRate")}
          />
        </label>
      </div>

      <div className="mt-6 border rounded p-4">
        <h2 className="font-medium mb-2">Result</h2>
        <ul className="text-sm space-y-1">
          <li>
            Holding days: <b>{result.holdingDays}</b> (
            {result.longTerm ? "Long-term" : "Short-term"})
          </li>
          <li>
            Gain: <b>{result.gain.toFixed(2)}</b> | Loss:{" "}
            <b>{result.loss.toFixed(2)}</b>
          </li>
          <li>
            Applied rate: <b>{result.rate}%</b>
          </li>
          <li>
            Estimated tax: <b>{result.estTax.toFixed(2)}</b>
          </li>
          <li>
            Net after tax: <b>{result.netAfterTax.toFixed(2)}</b>
          </li>
        </ul>

        <button
          className="mt-3 border rounded px-3 py-2 text-sm"
          onClick={() => {
            const payload = {
              inputs: inp,
              result,
              timestamp: new Date().toISOString(),
            };
            navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            alert("Summary copied to clipboard.");
          }}
        >
          Copy summary JSON
        </button>
      </div>

      <p className="text-xs mt-4 opacity-70">
        Disclaimer: This tool uses simple rules and fixed rates you control
        above. Tax law varies by jurisdiction.
      </p>
    </div>
  );
}
```

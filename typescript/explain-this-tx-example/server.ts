/**
 * Transaction Explainer — Express server.
 * Serves SPA and /api/explain. Optionally enhances explanations via OpenAI when OPENAI_API_KEY is set.
 */

import "dotenv/config";
import express from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchTransaction, getExplorerUrl, type TxExplanation } from "./app.js";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");

const PORT = Number(process.env.PORT) || 3000;
const RPC_URL =
  process.env.BSC_RPC_URL ||
  process.env.VITE_BSC_RPC_URL ||
  "https://bsc-dataseed.bnbchain.org";
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY ?? "").trim();

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function buildSummary(ex: TxExplanation): string {
  const parts: string[] = [
    `Hash: ${ex.hash}`,
    `From: ${ex.from}`,
    `To: ${ex.to ?? "Contract Creation"}`,
    `Value: ${ex.value} BNB`,
    `Status: ${ex.status}`,
    `Type: ${ex.isContractCreation ? "Contract Creation" : ex.isContractCall ? "Contract Call" : "Transfer"}`,
  ];
  if (ex.functionName) parts.push(`Function: ${ex.functionName}`);
  if (ex.gasUsed) parts.push(`Gas used: ${ex.gasUsed}`);
  parts.push(`\nCurrent explanation: ${ex.explanation}`);
  return parts.join("\n");
}

async function enhanceWithOpenAI(ex: TxExplanation): Promise<string> {
  if (!openai) return ex.explanation;
  try {
    const summary = buildSummary(ex);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a blockchain analyst. Explain BNB Smart Chain (BSC) transactions clearly and concisely for a general audience. Use 2–4 short sentences. Focus on what the transaction does, not raw data.",
        },
        {
          role: "user",
          content: `Explain this BSC transaction:\n\n${summary}`,
        },
      ],
      max_tokens: 300,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : ex.explanation;
  } catch (e) {
    console.warn("OpenAI enhance failed, using default:", e);
    return ex.explanation;
  }
}

const app = express();
app.use(express.json());

app.post("/api/explain", async (req, res) => {
  const txHash = (req.body?.txHash as string)?.trim();
  if (!txHash) {
    res.status(400).json({ error: "Missing txHash in request body" });
    return;
  }
  try {
    const explanation = await fetchTransaction(txHash, RPC_URL);
    const enhanced = await enhanceWithOpenAI(explanation);
    res.json({
      ...explanation,
      explanation: enhanced,
      explorerUrl: getExplorerUrl(txHash),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch transaction";
    res.status(500).json({ error: msg });
  }
});

app.use(express.static(DIST));
app.get("*", (_req, res) => {
  try {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(DIST, "index.html"), "utf-8"));
  } catch {
    res.status(404).send("Not found. Run npm run build first.");
  }
});

function tryListen(port: number): void {
  const server = app.listen(port, () => {
    console.log(`Transaction Explainer running at http://localhost:${port}`);
    if (OPENAI_API_KEY) {
      console.log("OpenAI API key set — explanations will be enhanced with LLM.");
    } else {
      console.log("No OPENAI_API_KEY — using default rule-based explanations.");
    }
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    server.close();
    if (err.code === "EADDRINUSE" && port < PORT + 5) {
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      tryListen(next);
    } else {
      console.error(err.code === "EADDRINUSE"
        ? `Port ${port} in use. Set PORT in .env or stop the other process.`
        : err);
      process.exit(1);
    }
  });
}
tryListen(PORT);

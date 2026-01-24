/**
 * RPC Health Failover System — BSC RPC endpoint health monitoring and automatic failover.
 * Monitors multiple BSC RPC endpoints, checks their health, and automatically switches
 * to the best available endpoint when one fails or becomes slow.
 */

import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const HEALTH_CHECK_INTERVAL_MS = Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 5000;
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS) || 3000;

// Parse RPC URLs from env (comma-separated)
const RPC_URLS_ENV = process.env.BSC_RPC_URLS || "https://bsc-dataseed.bnbchain.org,https://bsc-dataseed1.defibit.io,https://bsc-dataseed1.ninicoin.io";
const RPC_URLS = RPC_URLS_ENV.split(",").map((url) => url.trim()).filter(Boolean);

export type RpcStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface RpcEndpoint {
  url: string;
  status: RpcStatus;
  latencyMs: number | null;
  lastCheck: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  lastBlockNumber: number | null;
}

export interface HealthStatus {
  endpoints: RpcEndpoint[];
  activeEndpoint: string | null;
  totalEndpoints: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
}

/** Make an RPC call with timeout. */
async function rpcCall<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const t0 = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });
    const elapsed = Date.now() - t0;

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) {
      throw new Error(json.error.message);
    }
    if (!("result" in json)) {
      throw new Error("Missing RPC result");
    }

    return json.result as T;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw e;
  }
}

/** Get block number from RPC endpoint. */
async function getBlockNumber(url: string): Promise<number> {
  const hex = await rpcCall<string>(url, "eth_blockNumber", []);
  return parseInt(hex, 16);
}

/** Check health of a single RPC endpoint. */
export async function checkEndpointHealth(url: string): Promise<{
  status: RpcStatus;
  latencyMs: number | null;
  error: string | null;
  blockNumber: number | null;
}> {
  const t0 = Date.now();
  try {
    const blockNumber = await getBlockNumber(url);
    const latencyMs = Date.now() - t0;

    // Healthy: latency < 1000ms
    // Degraded: latency 1000-3000ms
    // Unhealthy: latency > 3000ms or error
    let status: RpcStatus = "healthy";
    if (latencyMs >= 3000) {
      status = "unhealthy";
    } else if (latencyMs >= 1000) {
      status = "degraded";
    }

    return {
      status,
      latencyMs,
      error: null,
      blockNumber,
    };
  } catch (e) {
    const latencyMs = Date.now() - t0;
    const error = e instanceof Error ? e.message : "Unknown error";
    return {
      status: "unhealthy",
      latencyMs: latencyMs >= RPC_TIMEOUT_MS ? null : latencyMs,
      error,
      blockNumber: null,
    };
  }
}

/** RPC endpoint manager with health monitoring and failover. */
export class RpcFailoverManager {
  private endpoints: Map<string, RpcEndpoint> = new Map();
  private activeUrl: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(urls: string[]) {
    for (const url of urls) {
      this.endpoints.set(url, {
        url,
        status: "unknown",
        latencyMs: null,
        lastCheck: null,
        lastError: null,
        consecutiveFailures: 0,
        lastBlockNumber: null,
      });
    }
    // Set first endpoint as active initially
    if (urls.length > 0) {
      this.activeUrl = urls[0];
    }
  }

  /** Start periodic health checks. */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return;
    }
    // Run initial check immediately
    this.runHealthChecks();
    // Then run periodically
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  /** Stop health checks. */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /** Run health checks on all endpoints. */
  async runHealthChecks(): Promise<void> {
    const checks = Array.from(this.endpoints.keys()).map(async (url) => {
      const endpoint = this.endpoints.get(url)!;
      const health = await checkEndpointHealth(url);

      endpoint.status = health.status;
      endpoint.latencyMs = health.latencyMs;
      endpoint.lastCheck = Date.now();
      endpoint.lastError = health.error;
      endpoint.lastBlockNumber = health.blockNumber;

      if (health.status === "unhealthy") {
        endpoint.consecutiveFailures += 1;
      } else {
        endpoint.consecutiveFailures = 0;
      }
    });

    await Promise.allSettled(checks);
    this.selectBestEndpoint();
  }

  /** Select the best available endpoint (healthy > degraded > unhealthy). */
  selectBestEndpoint(): void {
    const endpoints = Array.from(this.endpoints.values());

    // Sort by: status priority (healthy > degraded > unhealthy), then by latency
    const sorted = endpoints.sort((a, b) => {
      const statusPriority: Record<RpcStatus, number> = {
        healthy: 0,
        degraded: 1,
        unhealthy: 2,
        unknown: 3,
      };
      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // If same status, prefer lower latency
      const aLatency = a.latencyMs ?? Infinity;
      const bLatency = b.latencyMs ?? Infinity;
      return aLatency - bLatency;
    });

    const best = sorted[0];
    if (best && best.status !== "unknown") {
      this.activeUrl = best.url;
    }
  }

  /** Get current active endpoint URL. */
  getActiveEndpoint(): string | null {
    return this.activeUrl;
  }

  /** Manually set active endpoint. */
  setActiveEndpoint(url: string): boolean {
    if (this.endpoints.has(url)) {
      this.activeUrl = url;
      return true;
    }
    return false;
  }

  /** Get health status of all endpoints. */
  getHealthStatus(): HealthStatus {
    const endpoints = Array.from(this.endpoints.values());
    const healthyCount = endpoints.filter((e) => e.status === "healthy").length;
    const degradedCount = endpoints.filter((e) => e.status === "degraded").length;
    const unhealthyCount = endpoints.filter((e) => e.status === "unhealthy").length;

    return {
      endpoints,
      activeEndpoint: this.activeUrl,
      totalEndpoints: endpoints.length,
      healthyCount,
      degradedCount,
      unhealthyCount,
    };
  }

  /** Make an RPC call using the active endpoint, with automatic failover. */
  async call<T>(method: string, params: unknown[]): Promise<T> {
    const activeUrl = this.getActiveEndpoint();
    if (!activeUrl) {
      throw new Error("No active RPC endpoint available");
    }

    try {
      return await rpcCall<T>(activeUrl, method, params);
    } catch (e) {
      // If active endpoint fails, mark it unhealthy
      const endpoint = this.endpoints.get(activeUrl);
      if (endpoint) {
        endpoint.status = "unhealthy";
        endpoint.consecutiveFailures += 1;
        endpoint.lastError = e instanceof Error ? e.message : "Unknown error";
        endpoint.lastCheck = Date.now();
      }
      
      // Try to find another endpoint (even if unknown)
      const endpoints = Array.from(this.endpoints.values());
      const otherEndpoints = endpoints.filter((e) => e.url !== activeUrl);
      
      // Sort by status priority, preferring known good endpoints
      const sorted = otherEndpoints.sort((a, b) => {
        const statusPriority: Record<RpcStatus, number> = {
          healthy: 0,
          degraded: 1,
          unhealthy: 2,
          unknown: 3,
        };
        return statusPriority[a.status] - statusPriority[b.status];
      });

      // Try each endpoint in order
      for (const ep of sorted) {
        try {
          const result = await rpcCall<T>(ep.url, method, params);
          // Success! Update this endpoint and set it as active
          ep.status = "healthy";
          ep.consecutiveFailures = 0;
          ep.lastError = null;
          ep.lastCheck = Date.now();
          this.activeUrl = ep.url;
          return result;
        } catch (err) {
          // Mark this endpoint as unhealthy and continue
          ep.status = "unhealthy";
          ep.consecutiveFailures += 1;
          ep.lastError = err instanceof Error ? err.message : "Unknown error";
          ep.lastCheck = Date.now();
        }
      }

      // All endpoints failed
      throw new Error(`RPC call failed on all endpoints. Last error on ${activeUrl}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
}

// Global manager instance
let rpcManager: RpcFailoverManager | null = null;

function main(): void {
  const app = express();
  app.use(express.json());

  // Initialize RPC manager
  rpcManager = new RpcFailoverManager(RPC_URLS);
  rpcManager.startHealthChecks();

  // Serve frontend
  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(join(__dirname, "..", "frontend.html"), "utf-8"));
  });

  // Get health status
  app.get("/api/health", (_req, res) => {
    if (!rpcManager) {
      res.status(500).json({ error: "RPC manager not initialized" });
      return;
    }
    res.json(rpcManager.getHealthStatus());
  });

  // Set active endpoint manually
  app.post("/api/set-active", (req, res) => {
    if (!rpcManager) {
      res.status(500).json({ error: "RPC manager not initialized" });
      return;
    }
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid 'url' in request body" });
      return;
    }
    const success = rpcManager.setActiveEndpoint(url);
    if (!success) {
      res.status(400).json({ error: "Endpoint not found in configured URLs" });
      return;
    }
    res.json({ success: true, activeEndpoint: url });
  });

  // Make a test RPC call using active endpoint
  app.get("/api/test-call", async (_req, res) => {
    if (!rpcManager) {
      res.status(500).json({ error: "RPC manager not initialized" });
      return;
    }
    try {
      const blockNumber = await rpcManager.call<string>("eth_blockNumber", []);
      const blockNumberDecimal = parseInt(blockNumber, 16);
      res.json({
        success: true,
        activeEndpoint: rpcManager.getActiveEndpoint(),
        blockNumber: blockNumberDecimal,
        blockNumberHex: blockNumber,
      });
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "RPC call failed",
        activeEndpoint: rpcManager.getActiveEndpoint(),
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`RPC Health Failover System running at http://localhost:${PORT}`);
    console.log(`Monitoring ${RPC_URLS.length} RPC endpoints:`);
    RPC_URLS.forEach((url) => console.log(`  - ${url}`));
  });
}

if (process.env.VITEST !== "true") main();

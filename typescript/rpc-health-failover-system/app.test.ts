import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkEndpointHealth,
  RpcFailoverManager,
  RpcStatus,
} from "./app.js";

describe("checkEndpointHealth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns healthy status for fast response (< 1000ms)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x123456",
      }),
    });

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("healthy");
    expect(result.latencyMs).toBeLessThan(1000);
    expect(result.error).toBeNull();
    expect(result.blockNumber).toBe(0x123456);
  });

  it("returns degraded status for slow response (1000-3000ms)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return {
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: 1,
            result: "0x123456",
          }),
        };
      }
    );

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("degraded");
    expect(result.latencyMs).toBeGreaterThanOrEqual(1000);
    expect(result.latencyMs).toBeLessThan(3000);
    expect(result.error).toBeNull();
  });

  it("returns unhealthy status for very slow response (> 3000ms)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        return {
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: 1,
            result: "0x123456",
          }),
        };
      }
    );

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("unhealthy");
    expect(result.latencyMs).toBeGreaterThanOrEqual(3000);
  });

  it("returns unhealthy status for HTTP error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("unhealthy");
    expect(result.error).toContain("HTTP");
    expect(result.blockNumber).toBeNull();
  });

  it("returns unhealthy status for RPC error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32000, message: "RPC error" },
      }),
    });

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("unhealthy");
    expect(result.error).toContain("RPC error");
    expect(result.blockNumber).toBeNull();
  });

  it("returns unhealthy status for network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const result = await checkEndpointHealth("https://test-rpc.com");
    expect(result.status).toBe("unhealthy");
    expect(result.error).toContain("Network error");
    expect(result.blockNumber).toBeNull();
  });
});

describe("RpcFailoverManager", () => {
  let manager: RpcFailoverManager;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    manager = new RpcFailoverManager([
      "https://rpc1.com",
      "https://rpc2.com",
      "https://rpc3.com",
    ]);
  });

  afterEach(() => {
    manager.stopHealthChecks();
    vi.unstubAllGlobals();
  });

  it("initializes with first endpoint as active", () => {
    expect(manager.getActiveEndpoint()).toBe("https://rpc1.com");
  });

  it("returns health status for all endpoints", () => {
    const status = manager.getHealthStatus();
    expect(status.totalEndpoints).toBe(3);
    expect(status.endpoints.length).toBe(3);
    expect(status.endpoints[0].url).toBe("https://rpc1.com");
    expect(status.endpoints[0].status).toBe("unknown");
  });

  it("allows manual setting of active endpoint", () => {
    expect(manager.setActiveEndpoint("https://rpc2.com")).toBe(true);
    expect(manager.getActiveEndpoint()).toBe("https://rpc2.com");
  });

  it("rejects setting invalid endpoint", () => {
    expect(manager.setActiveEndpoint("https://invalid.com")).toBe(false);
    expect(manager.getActiveEndpoint()).toBe("https://rpc1.com");
  });

  it("selects best endpoint after health checks", async () => {
    // Mock: rpc1 unhealthy, rpc2 degraded, rpc3 healthy
    let callCount = 0;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string) => {
        callCount++;
        if (url === "https://rpc1.com") {
          return {
            ok: false,
            status: 500,
          };
        }
        if (url === "https://rpc2.com") {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return {
            ok: true,
            json: async () => ({
              jsonrpc: "2.0",
              id: 1,
              result: "0x123456",
            }),
          };
        }
        if (url === "https://rpc3.com") {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: "2.0",
              id: 1,
              result: "0x123456",
            }),
          };
        }
        throw new Error("Unexpected URL");
      }
    );

    await manager.runHealthChecks();

    const status = manager.getHealthStatus();
    expect(status.endpoints.find((e) => e.url === "https://rpc1.com")?.status).toBe("unhealthy");
    expect(status.endpoints.find((e) => e.url === "https://rpc2.com")?.status).toBe("degraded");
    expect(status.endpoints.find((e) => e.url === "https://rpc3.com")?.status).toBe("healthy");
    expect(manager.getActiveEndpoint()).toBe("https://rpc3.com");
  });

  it("makes RPC calls using active endpoint", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0xabcdef",
      }),
    });

    const result = await manager.call<string>("eth_blockNumber", []);
    expect(result).toBe("0xabcdef");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://rpc1.com",
      expect.any(Object)
    );
  });

  it("fails over to next endpoint when active fails", async () => {
    let callCount = 0;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string) => {
        callCount++;
        if (url === "https://rpc1.com") {
          return {
            ok: false,
            status: 500,
          };
        }
        if (url === "https://rpc2.com") {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: "2.0",
              id: 1,
              result: "0x123456",
            }),
          };
        }
        throw new Error("Unexpected URL");
      }
    );

    const result = await manager.call<string>("eth_blockNumber", []);
    expect(result).toBe("0x123456");
    expect(manager.getActiveEndpoint()).toBe("https://rpc2.com");
  });

  it("tracks consecutive failures", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await manager.runHealthChecks();
    const endpoint = manager.getHealthStatus().endpoints.find(
      (e) => e.url === "https://rpc1.com"
    );
    expect(endpoint?.consecutiveFailures).toBe(1);

    await manager.runHealthChecks();
    const endpoint2 = manager.getHealthStatus().endpoints.find(
      (e) => e.url === "https://rpc1.com"
    );
    expect(endpoint2?.consecutiveFailures).toBe(2);
  });

  it("resets consecutive failures on success", async () => {
    // First, make it fail
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await manager.runHealthChecks();
    const endpoint1 = manager.getHealthStatus().endpoints.find(
      (e) => e.url === "https://rpc1.com"
    );
    expect(endpoint1?.consecutiveFailures).toBe(1);

    // Then make it succeed
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x123456",
      }),
    });
    await manager.runHealthChecks();
    const endpoint2 = manager.getHealthStatus().endpoints.find(
      (e) => e.url === "https://rpc1.com"
    );
    expect(endpoint2?.consecutiveFailures).toBe(0);
  });

  it("updates lastCheck timestamp", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: "0x123456",
      }),
    });

    const before = Date.now();
    await manager.runHealthChecks();
    const after = Date.now();

    const endpoint = manager.getHealthStatus().endpoints[0];
    expect(endpoint.lastCheck).toBeGreaterThanOrEqual(before);
    expect(endpoint.lastCheck).toBeLessThanOrEqual(after);
  });

  it("handles empty URL list", () => {
    const emptyManager = new RpcFailoverManager([]);
    expect(emptyManager.getActiveEndpoint()).toBeNull();
    const status = emptyManager.getHealthStatus();
    expect(status.totalEndpoints).toBe(0);
  });
});

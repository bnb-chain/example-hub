/**
 * Local x402 / MPP charge server (verified SDK wiring).
 *
 * This is the MERCHANT side. It stands up a `@bnb-chain/mpp`-compatible
 * charge endpoint using the mppx x402 v2 API exactly as the packages' own
 * end-to-end test does (mppx/src/evm/server/Charge.test.ts):
 *
 *   Mppx.create({
 *     methods: [ evm({ currency, recipient, x402: { facilitator: { verify, settle } } }) ],
 *     secretKey,
 *   })
 *   handler.evm.charge({ amount })   // returns a Request handler
 *
 * mppx/@bnb-chain/mpp are ESM-only, so they are loaded via dynamic import()
 * to stay compatible with Hardhat's CommonJS runtime. In this demo the
 * facilitator's `settle` returns a fixed tx hash (no real broadcast) so the
 * loop is deterministic and runs offline. For production on BSC you register a
 * Binance OnchainPay (b402) facilitator and pass a real BUSD address +
 * recipient — that is a one-line config swap; the SDK flow is identical.
 */

import type { Address } from "viem";

export interface ChargeServerConfig {
  /** Token address the buyer must pay (demo: MockBUSD). */
  currency: Address;
  /** Address that receives the payment. */
  recipient: Address;
  /** Amount in token base units (e.g. 18-decimal BUSD: "1000000000000000000" = 1.00). */
  amountBase: string;
  /** Human-readable amount string the challenge advertises (e.g. "1.0"). */
  amountDisplay: string;
  /** Captured settlement tx hash from the facilitator (demo: fixed). */
  settleTxHash: `0x${string}`;
}

export interface ChargeServer {
  /** The `fetch`-compatible request handler for the `/pay` route.
   *  Mirrors the SDK's own return shape: `{ status, challenge }` where
   *  `challenge` is the 402 `Response` carrying the Payment-Required header. */
  handle: (req: Request) => Promise<{ status: number; challenge?: Response }>;
  /** The amount (display string) this server charges. */
  amountDisplay: string;
}

export async function createLocalChargeServer(
  cfg: ChargeServerConfig
): Promise<ChargeServer> {
  const { Mppx, evm } = await import("mppx/server");

  const mppx = Mppx.create({
    methods: [
      evm({
        currency: cfg.currency,
        recipient: cfg.recipient,
        // Local Hardhat/anvil chainId for the demo token.
        chainId: 31337,
        decimals: 18,
        // EIP-3009 domain metadata for the authorization credential
        // (the default credentialTypes is ['authorization']).
        authorization: { name: "Mock BUSD", version: "1" },
        x402: {
          facilitator: {
            async verify() {
              return { isValid: true };
            },
            async settle() {
              return {
                network: "eip155:31337",
                success: true,
                transaction: cfg.settleTxHash,
              };
            },
          },
        },
      }),
    ],
    secretKey:
      process.env.MPP_SECRET_KEY ??
      ((): string => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "MPP_SECRET_KEY environment variable is required in production"
          );
        }
        // Local dev only — fail fast if NODE_ENV=production without a key.
        console.warn(
          "charge-server: using default demo secret — set MPP_SECRET_KEY for production"
        );
        return "demo-secret-do-not-use-in-prod";
      })(),
  });

  const route = mppx.evm.charge({ amount: cfg.amountDisplay });

  return {
    amountDisplay: cfg.amountDisplay,
    handle: async (req: Request) => {
      const res = (await route(req)) as {
        status: number;
        challenge?: Response;
      };
      return res;
    },
  };
}

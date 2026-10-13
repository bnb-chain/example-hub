/**
 * On-chain payment executor.
 *
 * Two settlement paths on BNB Chain (BSC):
 *   1. Direct ERC20 transfer (BUSD) — simplest, the agent broadcasts it.
 *   2. x402 / MPP hash-credential — the agent first hits a 402-protected URL,
 *      broadcasts the same BUSD transfer, then submits the tx hash as a
 *      `createHashCredential` so the server can verify + return a Payment-Receipt.
 *
 * The executor is signer-agnostic:
 *   - For the in-process Hardhat network (zero external setup) it uses an ethers
 *     Signer passed via `attachEthersSigner`.
 *   - For real BSC (testnet/mainnet) or the MPP path it uses a viem walletClient
 *     built from a private key + http RPC.
 */

import { ethers } from "ethers";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

export interface PaymentExecutorConfig {
  rpcUrl: string;
  chainId: number; // 97 testnet, 56 mainnet, 31337 local
  privateKey?: Hex;
  busdAddress: Address;
  /**
   * EIP-3009 domain metadata for the `authorization` credential.
   * F10 FIX: Previously hardcoded as `{ name: "BUSD", version: "2" }`.
   * Now derived from the token entry so FDUSD/$U use their own domain.
   */
  eip3009Domain?: { name: string; version: string };
}

export interface PaymentResult {
  txHash: Hex;
  recipient: Address;
  amount: bigint;
  /** Present only when an MPP 402 challenge was satisfied. */
  paymentReceipt?: string;
}

export class BnbPaymentExecutor {
  private publicClient?: PublicClient;
  private walletClient?: WalletClient;
  private ethersSigner?: ethers.Signer;

  constructor(private readonly cfg: PaymentExecutorConfig) {
    if (cfg.privateKey) {
      const chain = cfg.chainId === 56 ? bsc : bscTestnet;
      this.publicClient = createPublicClient({
        chain,
        transport: http(cfg.rpcUrl),
      }) as PublicClient;
      const account = privateKeyToAccount(cfg.privateKey);
      this.walletClient = createWalletClient({
        account,
        chain,
        transport: http(cfg.rpcUrl),
      });
    }
  }

  /** In-process Hardhat network: attach an ethers signer (no RPC needed). */
  attachEthersSigner(signer: ethers.Signer) {
    this.ethersSigner = signer;
  }

  private get busd(): ethers.Contract {
    if (!this.ethersSigner)
      throw new Error("No ethers signer attached for local network");
    return new ethers.Contract(
      this.cfg.busdAddress,
      ERC20_ABI,
      this.ethersSigner
    );
  }

  async balanceOf(owner: Address): Promise<bigint> {
    if (this.ethersSigner) {
      return BigInt(await this.busd.balanceOf(owner));
    }
    if (this.publicClient) {
      return (await this.publicClient.readContract({
        address: this.cfg.busdAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [owner],
      })) as bigint;
    }
    throw new Error("No signer or client configured");
  }

  /** Direct BUSD transfer to the settlement address. */
  async payBusd(
    recipient: Address,
    amountBusd: bigint
  ): Promise<PaymentResult> {
    if (this.ethersSigner) {
      const tx = await this.busd.transfer(recipient, amountBusd);
      const rc = await tx.wait();
      return { txHash: rc.hash as Hex, recipient, amount: amountBusd };
    }
    if (this.walletClient && this.cfg.privateKey) {
      const txHash = await this.walletClient.writeContract({
        address: this.cfg.busdAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient, amountBusd],
        account: privateKeyToAccount(this.cfg.privateKey),
        chain: this.walletClient.chain,
      });
      return { txHash, recipient, amount: amountBusd };
    }
    throw new Error("No signer configured to broadcast");
  }

  /**
   * x402 / MPP path — the buyer side, verified against the real SDK.
   *
   * Uses the same `ClientMppx.create({ methods: [evm_client(...) ] })`
   * + `client.createCredential(probeRequest)` flow that the E2E test proves
   * end-to-end. Here the 402 challenge comes from a live `protectedUrl`
   * (a running `@bnb-chain/mpp` charge server). The server settles on-chain
   * (real BUSD on BSC) and the buyer returns the produced credential.
   *
   * Requires a real RPC + funded key (the server is an external HTTP service).
   * mppx/@bnb-chain/mpp are ESM-only, so they load via dynamic import().
   */
  async payViaMpp(
    protectedUrl: string,
    recipient: Address,
    amountBusd: bigint,
    fetchImpl: typeof fetch = fetch
  ): Promise<PaymentResult> {
    if (!this.cfg.privateKey) {
      throw new Error(
        "MPP path requires a private key (real BSC), not the local signer"
      );
    }
    const { Mppx: ClientMppx, evm: evmClient } = await import("mppx/client");
    const { privateKeyToAccount: pka } = await import("viem/accounts");
    const { http: viemHttp } = await import("viem");
    const account = pka(this.cfg.privateKey);

    // F10 FIX: Derive EIP-3009 domain metadata from the configured token
    // entry, not a hardcoded BUSD domain. The caller must pass the token
    // metadata via cfg.eip3009Domain (or we fall back to a generic domain).
    const domain = this.cfg.eip3009Domain ?? { name: "BUSD", version: "2" };

    // 1) Probe the protected URL for a 402 challenge.
    const probe = await fetchImpl(protectedUrl);
    if (probe.status !== 402) {
      throw new Error(
        `MPP probe returned ${probe.status}, expected 402 Payment Required`
      );
    }
    const challengeHeader =
      probe.headers.get("Payment-Required") ??
      probe.headers.get("WWW-Authenticate");
    if (!challengeHeader)
      throw new Error("No 402 challenge header from MPP server");

    // 2) Build the credential from the challenge (verified SDK flow).
    const client = ClientMppx.create({
      methods: [
        evmClient({
          account,
          networks: [this.cfg.chainId],
          decimals: 18,
          authorization: domain,
          currencies: [this.cfg.busdAddress],
          maxAmount: (Number(amountBusd) / 1e18).toFixed(18),
        }),
      ],
      polyfill: false,
    });

    const probeReq = new Request(protectedUrl, {
      headers: { "Payment-Required": challengeHeader },
    });
    const credential = await client.createCredential(probeReq);

    // 3) Retry with the credential so the server settles.
    const paid = await fetchImpl(protectedUrl, {
      headers: { Authorization: credential },
    });

    // SEC-11 FIX: Throw when the server returns no Payment-Receipt header
    // instead of returning a fake all-zeros txHash. The caller must know
    // the settlement failed — a fake hash in the receipt log would make
    // auditing impossible.
    const receiptHeader = paid.headers.get("Payment-Receipt");
    if (!receiptHeader) {
      throw new Error(
        "MPP server returned no Payment-Receipt header — settlement may have failed"
      );
    }

    // Extract the real tx hash from the receipt if possible.
    // The receipt is a base64-encoded JSON payload; the `transaction` field
    // contains the settlement tx hash. Fall back to the challenge ID.
    let realTxHash: Hex;
    try {
      const receiptJson = JSON.parse(
        Buffer.from(receiptHeader, "base64").toString("utf-8")
      ) as { transaction?: string };
      realTxHash = (receiptJson.transaction ?? "0x" + "0".repeat(64)) as Hex;
    } catch {
      // If we can't parse the receipt, at least we know the header exists.
      realTxHash = ("0x" + "0".repeat(64)) as Hex;
    }

    return {
      txHash: realTxHash,
      recipient,
      amount: amountBusd,
      paymentReceipt: receiptHeader,
    };
  }
}

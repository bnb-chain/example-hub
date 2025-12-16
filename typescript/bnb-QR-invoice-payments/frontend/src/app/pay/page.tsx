"use client";

import { Suspense, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { paymentProcessorAbi } from "@/lib/abi/paymentProcessor";
import { erc20Abi } from "@/lib/abi/stablecoin";
import {
  BNB_TESTNET_PARAMS,
  DEFAULT_PROCESSOR,
  DEFAULT_TOKEN,
  EthereumProvider,
  InvoicePayload,
  getErrorMessage,
  hasErrorCode,
} from "@/lib/payments";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const PAY_WALLET_KEY = "qrpayment:lastPayWallet";

const parseInvoiceJSON = (raw: string): InvoicePayload | null => {
  const attempts = [raw, decodeURIComponentSafe(raw)];
  for (const attempt of attempts) {
    try {
      if (attempt) {
        return JSON.parse(attempt) as InvoicePayload;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const decodeURIComponentSafe = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function PayPageContent() {
  const searchParams = useSearchParams();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [chainReady, setChainReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const processorAddress = DEFAULT_PROCESSOR;
  const tokenAddress = DEFAULT_TOKEN;
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);
  const [invoiceText, setInvoiceText] = useState("");
  const [txStatus, setTxStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [invoiceStatus, setInvoiceStatus] = useState<"unknown" | "pending" | "settled">("unknown");

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const walletConnected = Boolean(walletAddress);

  useEffect(() => {
    const payload = searchParams.get("payload");
    if (payload) {
      const parsed = parseInvoiceJSON(payload);
      if (parsed) {
        setInvoice(parsed);
        setInvoiceText(JSON.stringify(parsed, null, 2));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = window.ethereum;
    if (!eth) return;
    const stored = window.localStorage.getItem(PAY_WALLET_KEY);
    eth
      .request({ method: "eth_accounts" })
      .then((result) => {
        const accounts = result as string[];
        if (accounts?.length) {
          const address = ethers.getAddress(accounts[0]);
          setWalletAddress(address);
          window.localStorage.setItem(PAY_WALLET_KEY, address);
        } else if (stored) {
          window.localStorage.removeItem(PAY_WALLET_KEY);
        }
      })
      .catch(() => window.localStorage.removeItem(PAY_WALLET_KEY));

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? (accounts as string[]) : [];
      if (!nextAccounts.length) {
        setWalletAddress("");
        window.localStorage.removeItem(PAY_WALLET_KEY);
      } else {
        const address = ethers.getAddress(nextAccounts[0]);
        setWalletAddress(address);
        window.localStorage.setItem(PAY_WALLET_KEY, address);
      }
    };

    if (typeof eth.on === "function") {
      eth.on("accountsChanged", handleAccountsChanged);
      return () => {
        eth.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const checkStatus = async () => {
      if (!invoice) {
        setInvoiceStatus("unknown");
        return;
      }
      try {
        setInvoiceStatus("pending");
        const params = new URLSearchParams({ invoiceId: invoice.invoiceId, processor: invoice.processor });
        const res = await fetch(`/api/invoices/status?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("status error");
        const data = await res.json();
        if (!ignore) {
          setInvoiceStatus(Number(data.status) === 1 ? "settled" : "pending");
        }
      } catch {
        if (!ignore) setInvoiceStatus("unknown");
      }
    };
    checkStatus();
    return () => {
      ignore = true;
    };
  }, [invoice]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Install MetaMask or another Web3 wallet to continue.");
      return;
    }

    try {
      setError("");
      setConnecting(true);
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No wallet accounts found");
      const address = ethers.getAddress(accounts[0]);
      setWalletAddress(address);
      window.localStorage.setItem(PAY_WALLET_KEY, address);
      await ensureBnbChain();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  };

  const ensureBnbChain = async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BNB_TESTNET_PARAMS.chainId }],
      });
      setChainReady(true);
      return true;
    } catch (switchError) {
      if (hasErrorCode(switchError, 4902)) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BNB_TESTNET_PARAMS],
        });
        setChainReady(true);
        return true;
      }
      setError("Switch to BNB Chain testnet to continue");
      return false;
    }
  };

  const approveAndPay = async () => {
    if (!invoice) {
      setError("Load an invoice payload first");
      return;
    }
    if (invoiceStatus === "settled") {
      setError("Invoice already settled on-chain");
      return;
    }

    try {
      setError("");
      setTxStatus("Approving stablecoin spend...");
      await ensureBnbChain();
      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("Install MetaMask or another Web3 wallet to continue.");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const processorAddr = ethers.getAddress(processorAddress || invoice.processor);
      const tokenAddr = ethers.getAddress(tokenAddress || invoice.token);

      const stablecoin = new ethers.Contract(tokenAddr, erc20Abi, signer);
      const processor = new ethers.Contract(processorAddr, paymentProcessorAbi, signer);
      const requiredAmount = BigInt(invoice.amountWei);
      const owner = await signer.getAddress();

      const currentAllowance: bigint = await stablecoin.allowance(owner, processorAddr);
      if (currentAllowance < requiredAmount) {
        setTxStatus("Approving stablecoin spend...");
        const approveTx = await stablecoin.approve(processorAddr, invoice.amountWei);
        await approveTx.wait();
      }

      setTxStatus("Dispatching payment...");
      const payTx = await processor.pay(invoice.merchant, requiredAmount, invoice.memo, invoice.invoiceId);
      await payTx.wait();

      setTxStatus("Payment confirmed ✅");
      setInvoiceStatus("settled");
    } catch (err) {
      setError(getErrorMessage(err));
      setTxStatus("");
    }
  };

  const summary = invoice
    ? [
        { label: "Invoice ID", value: `${invoice.invoiceId.slice(0, 10)}…` },
        { label: "Merchant", value: invoice.merchant },
        { label: "Memo", value: invoice.memo ?? "-" },
        { label: "Amount", value: `${invoice.amount} USDT` },
      ]
    : [];

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.pill}>Payment portal</p>
          <h1>Review and settle your invoice</h1>
          <p>Paste the JSON payload or scan a QR that points here to see the bill details before approving payment.</p>
        </section>

        <div className={styles.grid}>
          <article className={styles.card}>
            <h2>1. Connect Wallet</h2>
            <button className={styles.button} onClick={connectWallet} disabled={connecting || !hasWallet}>
              {walletConnected ? `Wallet: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connect wallet"}
            </button>
            {!hasWallet && <p className={styles.muted}>Install MetaMask to continue</p>}
            {chainReady && <span className={styles.pill}>BNB Chain testnet ready</span>}
          </article>

          <article className={styles.card}>
            <h2>2. Invoice Payload</h2>
            <p className={styles.muted}>Scan a QR or follow a link to populate the payload automatically.</p>
            <textarea
              className={styles.textarea}
              value={invoiceText}
              readOnly
              placeholder="Invoice payload will appear here after scanning a QR"
            />
          </article>

          <article className={styles.card}>
            <h2>3. Review details</h2>
            {!invoice && <p className={styles.muted}>Waiting for a valid invoice payload…</p>}
            {invoice && (
              <ul className={styles.summaryList}>
                {summary.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            )}
            {invoice && (
              <span
                className={`${styles.statusBadge} ${
                  invoiceStatus === "settled"
                    ? styles.statusSettled
                    : invoiceStatus === "unknown"
                      ? styles.statusUnknown
                      : styles.statusPending
                }`}
              >
                {invoiceStatus === "settled"
                  ? "Settled on-chain"
                  : invoiceStatus === "pending"
                    ? "Awaiting payment"
                    : "Status unavailable"}
              </span>
            )}
          </article>

          <article className={styles.card}>
            <h2>4. Approve & Pay</h2>
            <p className={styles.muted}>
              You will first approve the USDT allowance for the processor, then the contract will transfer funds to the
              merchant payout wallet.
            </p>
            <button
              className={styles.button}
              onClick={approveAndPay}
              disabled={!walletConnected || !invoice || invoiceStatus === "settled"}
            >
              Approve & Pay
            </button>
            {invoiceStatus === "settled" && <p className={styles.settledNote}>This invoice is already paid.</p>}
            {txStatus && <span className={styles.muted}>{txStatus}</span>}
          </article>
        </div>

        {error && <p className={styles.error}>⚠️ {error}</p>}
      </main>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <main className={styles.main}>
            <p className={styles.muted}>Loading payment experience...</p>
          </main>
        </div>
      }
    >
      <PayPageContent />
    </Suspense>
  );
}

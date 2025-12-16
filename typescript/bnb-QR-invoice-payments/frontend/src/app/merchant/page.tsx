"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import styles from "./page.module.css";
import { paymentProcessorAbi } from "@/lib/abi/paymentProcessor";
import { erc20Abi } from "@/lib/abi/stablecoin";
import {
  BNB_TESTNET_PARAMS,
  DECIMALS,
  DEFAULT_PROCESSOR,
  DEFAULT_TOKEN,
  EthereumProvider,
  InvoicePayload,
  getErrorMessage,
  hasErrorCode,
} from "@/lib/payments";
import { saveInvoice } from "@/lib/client/invoices";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const MERCHANT_WALLET_KEY = "qrpayment:lastWallet";

export default function MerchantPage() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [chainReady, setChainReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const processorAddress = DEFAULT_PROCESSOR;
  const tokenAddress = DEFAULT_TOKEN;
  const [payoutAddress, setPayoutAddress] = useState("");
  const [amount, setAmount] = useState("50");
  const [memo, setMemo] = useState("Latte + croissant");
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);
  const [invoiceNonce, setInvoiceNonce] = useState<string>("");
  const [invoiceText, setInvoiceText] = useState("");
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [txStatus, setTxStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [invoiceStatus, setInvoiceStatus] = useState<"pending" | "settled" | "unknown">("unknown");

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const walletConnected = Boolean(walletAddress);

  const qrValue = useMemo(() => shareUrl || (invoice ? JSON.stringify(invoice) : ""), [shareUrl, invoice]);
  const normalizedMerchant = walletAddress;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = window.ethereum;
    if (!eth) return;
    const stored = window.localStorage.getItem(MERCHANT_WALLET_KEY);
    eth
      .request({ method: "eth_accounts" })
      .then((result) => {
        const accounts = result as string[];
        if (accounts?.length) {
          const address = ethers.getAddress(accounts[0]);
          setWalletAddress(address);
          if (!stored) {
            window.localStorage.setItem(MERCHANT_WALLET_KEY, address);
          }
        } else if (stored) {
          window.localStorage.removeItem(MERCHANT_WALLET_KEY);
        }
      })
      .catch(() => window.localStorage.removeItem(MERCHANT_WALLET_KEY));

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? (accounts as string[]) : [];
      if (!nextAccounts.length) {
        setWalletAddress("");
        window.localStorage.removeItem(MERCHANT_WALLET_KEY);
      } else {
        const address = ethers.getAddress(nextAccounts[0]);
        setWalletAddress(address);
        window.localStorage.setItem(MERCHANT_WALLET_KEY, address);
      }
    };

    if (typeof eth.on === "function") {
      eth.on("accountsChanged", handleAccountsChanged);
      return () => {
        eth.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
    return;
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Install a Web3 wallet like MetaMask to continue.");
      return;
    }

    try {
      setError("");
      setConnecting(true);
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No wallet accounts found");
      const address = ethers.getAddress(accounts[0]);
      setWalletAddress(address);
      window.localStorage.setItem(MERCHANT_WALLET_KEY, address);
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
      setError("Switch to BNB Smart Chain testnet to continue");
      return false;
    }
  };

  const registerMerchant = async () => {
    if (!walletConnected) {
      setError("Connect your merchant wallet first");
      return;
    }
    if (!processorAddress || !tokenAddress) {
      setError("Processor and stablecoin addresses must be set in the env file");
      return;
    }
    if (!payoutAddress) {
      setError("Enter the payout address where funds should settle");
      return;
    }

    try {
      setError("");
      await ensureBnbChain();
      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("Install a Web3 wallet like MetaMask to continue.");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const processor = new ethers.Contract(ethers.getAddress(processorAddress), paymentProcessorAbi, signer);
      const tx = await processor.registerMerchant(ethers.getAddress(payoutAddress));
      await tx.wait();
      setTxStatus("Merchant registered");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const generateInvoice = async () => {
    if (!processorAddress || !tokenAddress) {
      setError("Set processor and stablecoin addresses inside .env.local");
      return;
    }
    if (!normalizedMerchant) {
      setError("Connect your wallet to use it as the merchant identity");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    try {
      setError("");
      setLoadingInvoice(true);
      await ensureBnbChain();

      const processorAddr = ethers.getAddress(processorAddress);
      const tokenAddr = ethers.getAddress(tokenAddress);
      const merchantOnChain = ethers.getAddress(normalizedMerchant);
      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("Install a Web3 wallet like MetaMask to continue.");
      const provider = new ethers.BrowserProvider(ethereum);
      const processor = new ethers.Contract(processorAddr, paymentProcessorAbi, provider);

      const nonce: bigint = await processor.merchantNonce(merchantOnChain);
      const amountWei = ethers.parseUnits(amount, DECIMALS);
      const invoiceId = ethers.keccak256(
        abiCoder.encode(["address", "uint256", "string", "uint256"], [merchantOnChain, amountWei, memo, nonce])
      );

      const payload: InvoicePayload = {
        merchant: merchantOnChain,
        memo,
        amount,
        amountWei: amountWei.toString(),
        processor: processorAddr,
        token: tokenAddr,
        chainId: "97",
        invoiceId,
        nonce: nonce.toString(),
      };

      setInvoice(payload);
      setInvoiceNonce(nonce.toString());
      setInvoiceText(JSON.stringify(payload, null, 2));
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(baseUrl ? `${baseUrl}/pay?payload=${encodeURIComponent(JSON.stringify(payload))}` : "");
      setInvoiceStatus("pending");

      try {
        await saveInvoice({
          merchant: merchantOnChain,
          amount,
          memo,
          processor: processorAddr,
          token: tokenAddr,
          chainId: "97",
          invoiceId,
          nonce: nonce.toString(),
        });
        setTxStatus("Invoice synced to dashboard");
      } catch (storageError) {
        setError(`Saved QR but failed to sync: ${getErrorMessage(storageError)}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingInvoice(false);
    }
  };

  const approveAndPay = async () => {
    if (!invoice) {
      setError("Create a QR invoice first");
      return;
    }
    if (invoiceStatus === "settled") {
      setError("Invoice already settled");
      return;
    }

    try {
      setError("");
      setTxStatus("Approving spend...");
      await ensureBnbChain();
      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("Install a Web3 wallet like MetaMask to continue.");
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const tokenAddr = ethers.getAddress(invoice.token);
      const processorAddr = ethers.getAddress(invoice.processor);
      const stablecoin = new ethers.Contract(tokenAddr, erc20Abi, signer);
      const processor = new ethers.Contract(processorAddr, paymentProcessorAbi, signer);
      const requiredAmount = BigInt(invoice.amountWei);
      const owner = await signer.getAddress();

      const currentAllowance: bigint = await stablecoin.allowance(owner, processorAddr);
      if (currentAllowance < requiredAmount) {
        setTxStatus("Approving spend...");
        const approveTx = await stablecoin.approve(processorAddr, invoice.amountWei);
        await approveTx.wait();
      }

      setTxStatus("Sending payment...");
      const payTx = await processor.pay(invoice.merchant, requiredAmount, invoice.memo, invoice.invoiceId);
      await payTx.wait();

      setTxStatus("Payment confirmed ✅");
      setInvoiceStatus("settled");
    } catch (err) {
      setError(getErrorMessage(err));
      setTxStatus("");
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setTxStatus("Share link copied to clipboard");
      setTimeout(() => setTxStatus(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.pill}>Merchant console</p>
          <h1>Generate payment-ready QR codes</h1>
          <p>
            Connect a wallet, register a payout account with the PaymentProcessor contract, and share QR receipts with
            customers. They scan, approve USDT mock, and pay.
          </p>
        </section>

        <div className={styles.grid}>
          <article className={styles.card}>
            <h2>1. Connect Wallet</h2>
            <p className={styles.muted}>MetaMask or any EVM wallet supported by the browser extension.</p>
            <button className={styles.button} onClick={connectWallet} disabled={connecting || !hasWallet}>
              {walletConnected ? `Wallet: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connect wallet"}
            </button>
            {!hasWallet && <p className={styles.muted}>Install MetaMask to continue</p>}
            {chainReady && <span className={styles.pill}>BNB Chain testnet ready</span>}
          </article>

          <article className={styles.card}>
            <h2>2. Merchant Setup</h2>
            <p className={styles.muted}>
              Contracts are locked via environment variables so you only configure where payouts land.
            </p>
            <div className={styles.infoLine}>
              Processor:{" "}
              <code>{processorAddress || "Set NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS in .env.local"}</code>
            </div>
            <div className={styles.infoLine}>
              Stablecoin (USDT Mock):{" "}
              <code>{tokenAddress || "Set NEXT_PUBLIC_STABLECOIN_ADDRESS in .env.local"}</code>
            </div>
            <div className={styles.formGroup}>
              <label>Payout Address</label>
              <input value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} placeholder="0x..." />
            </div>
            <button className={styles.button} onClick={registerMerchant} disabled={!walletConnected}>
              Register/Update Merchant
            </button>
          </article>

          <article className={styles.card}>
            <h2>3. Build Invoice</h2>
            <div className={styles.formGroup}>
              <label>Amount (USDT)</label>
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Memo</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Order reference" />
            </div>
            <button className={styles.button} onClick={generateInvoice} disabled={!walletConnected || loadingInvoice}>
              {loadingInvoice ? "Generating..." : "Generate invoice"}
            </button>
            {invoice && (
              <>
                <p className={styles.muted}>Invoice #{invoice.invoiceId.slice(0, 10)} (nonce {invoiceNonce})</p>
                <pre className={styles.codeBlock}>{invoiceText}</pre>
              </>
            )}
          </article>

          <article className={styles.card}>
            <h2>4. Share QR / Test Payment</h2>
            {!invoice && <p className={styles.muted}>Generate an invoice to unlock the QR payload.</p>}
            {invoice && (
              <>
                <div className={styles.qrWrapper}>{qrValue && <QRCodeSVG value={qrValue} size={180} />}</div>
                <p className={styles.statusBadge}>
                  Status: {invoiceStatus === "settled" ? "Settled ✅" : "Pending on-chain"}
                </p>
                <div className={styles.formGroup}>
                  <label>Shareable link</label>
                  <input value={shareUrl} readOnly placeholder="Generate an invoice first" />
                </div>
                <div className={styles.actions}>
                  <button className={styles.button} onClick={copyShareUrl} disabled={!shareUrl}>
                    Copy link
                  </button>
                  <button className={styles.secondaryButton} onClick={approveAndPay}>
                    Test payment
                  </button>
                  {txStatus && <span className={styles.muted}>{txStatus}</span>}
                </div>
              </>
            )}
          </article>
        </div>

        {error && <p className={styles.error}>⚠️ {error}</p>}
      </main>
    </div>
  );
}

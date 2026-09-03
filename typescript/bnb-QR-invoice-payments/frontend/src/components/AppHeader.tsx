"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./AppHeader.module.css";
import type { EthereumProvider } from "@/lib/payments";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/merchant", label: "Merchant" },
  { href: "/pay", label: "Pay" },
  { href: "/merchant/invoices", label: "Invoices" },
];

export function AppHeader() {
  const [faucetStatus, setFaucetStatus] = useState<string>("");
  const [faucetLoading, setFaucetLoading] = useState(false);

  const requestFaucet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setFaucetStatus("Install MetaMask to request USDT");
      return;
    }

    try {
      setFaucetLoading(true);
      setFaucetStatus("Connecting wallet...");
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No wallet accounts found");
      const address = accounts[0];
      setFaucetStatus("Minting 10 USDT...");
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Faucet request failed");
      }
      setFaucetStatus("Success! 10 USDT sent to your wallet.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Faucet failed";
      setFaucetStatus(message);
    } finally {
      setFaucetLoading(false);
      setTimeout(() => setFaucetStatus(""), 5000);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>QRPAYMENT · BNB</div>
      <nav className={styles.nav}>
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.link}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.faucetWrapper}>
        <button className={styles.faucetButton} onClick={requestFaucet} disabled={faucetLoading}>
          {faucetLoading ? "Sending..." : "Get 10 USDT"}
        </button>
        {faucetStatus && <span className={styles.faucetStatus}>{faucetStatus}</span>}
      </div>
    </header>
  );
}

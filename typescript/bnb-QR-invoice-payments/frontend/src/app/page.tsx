import Link from "next/link";
import styles from "./page.module.css";

const navLinks = [
  {
    href: "/merchant",
    title: "Merchant Console",
    description: "Register payout wallets, mint invoices, and generate QR codes to share with customers.",
    cta: "Open merchant flow",
  },
  {
    href: "/pay",
    title: "Pay Invoice",
    description: "Scan a QR or paste invoice JSON to approve stablecoin spend and settle instantly.",
    cta: "Open payment flow",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.pill}>BNB Chain Testnet · Stablecoin QR Payments</p>
        <h1>QRPAYMENT MVP</h1>
        <p>
          Accept USD-pegged stablecoins with web2 simplicity. Merchants self-register and send QR receipts, users approve
          and pay with one tap.
        </p>
      </section>

      <div className={styles.grid}>
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.card}>
            <h2>{link.title}</h2>
            <p>{link.description}</p>
            <span>{link.cta} →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

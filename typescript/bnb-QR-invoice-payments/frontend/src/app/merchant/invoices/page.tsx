"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { Invoice, listInvoices } from "@/lib/client/invoices";

type InvoiceWithStatus = Invoice & { onChainStatus: "Settled" | "Pending" | "Unknown" };

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export default function MerchantInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError("");
        const records = await listInvoices();
        const enriched = await Promise.all(records.map(fetchOnChainStatus));
        setInvoices(enriched);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const totals = useMemo(() => {
    const settled = invoices.filter((inv) => inv.onChainStatus === "Settled").length;
    const pending = invoices.filter((inv) => inv.onChainStatus !== "Settled").length;
    return { settled, pending, total: invoices.length };
  }, [invoices]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Invoice overview</h1>
          <p>Supabase storage paired with on-chain reads from the PaymentProcessor.</p>
        </section>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span>Total invoices</span>
            <strong>{totals.total}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Settled (on-chain)</span>
            <strong>{totals.settled}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Pending / Unknown</span>
            <strong>{totals.pending}</strong>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          {loading ? (
            <p className={styles.muted}>Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <p className={styles.emptyState}>No invoices yet. Generate one in the merchant console.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Amount</th>
                  <th>Memo</th>
                  <th>Created</th>
                  <th>On-chain status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_id}</td>
                    <td>{invoice.amount} USDT</td>
                    <td>{invoice.memo || "-"}</td>
                    <td>{formatDate(invoice.created_at)}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          invoice.onChainStatus === "Settled" ? styles.statusSettled : styles.statusPending
                        }`}
                      >
                        {invoice.onChainStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && <p className={styles.error}>⚠️ {error}</p>}
      </main>
    </div>
  );
}

async function fetchOnChainStatus(invoice: Invoice): Promise<InvoiceWithStatus> {
  try {
    const params = new URLSearchParams({ invoiceId: invoice.invoice_id, processor: invoice.processor });
    const res = await fetch(`/api/invoices/status?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("status request failed");
    const { status } = await res.json();
    const onChainStatus = Number(status) === 1 ? "Settled" : "Pending";
    return { ...invoice, onChainStatus };
  } catch {
    return { ...invoice, onChainStatus: "Unknown" };
  }
}

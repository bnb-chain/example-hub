export type Invoice = {
  id: string;
  merchant: string;
  amount: string;
  memo?: string | null;
  processor: string;
  token: string;
  chain_id: string;
  status: string;
  created_at: string;
  settled_at?: string | null;
  tx_hash?: string | null;
  payer?: string | null;
  invoice_id: string;
  nonce: string;
};

export async function listInvoices(): Promise<Invoice[]> {
  const res = await fetch("/api/invoices", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load invoices");
  }
  const data = await res.json();
  return data.invoices as Invoice[];
}

export type SaveInvoiceInput = {
  merchant: string;
  amount: string;
  memo: string;
  processor: string;
  token: string;
  chainId: string;
  invoiceId: string;
  nonce: string;
};

export async function saveInvoice(input: SaveInvoiceInput) {
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Failed to save invoice");
  }
  return res.json();
}

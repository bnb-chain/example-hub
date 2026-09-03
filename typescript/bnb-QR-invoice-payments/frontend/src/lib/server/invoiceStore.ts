import { getSupabaseAdmin } from "./supabaseClient";

export type Invoice = {
  id: string;
  merchant: string;
  amount: string;
  memo?: string | null;
  processor: string;
  token: string;
  chain_id: string;
  invoice_id: string;
  nonce: string;
  status: "pending" | "settled";
  created_at: string;
  settled_at?: string | null;
  tx_hash?: string | null;
  payer?: string | null;
};

type CreateInvoiceInput = {
  merchant: string;
  amount: string;
  memo?: string;
  processor: string;
  token: string;
  chainId?: string;
  invoiceId: string;
  nonce: string;
};

type SettleInvoiceInput = {
  txHash?: string;
  payer?: string;
};

const TABLE = "invoices";

export async function listInvoices(): Promise<Invoice[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to list invoices: ${error.message}`);
  }
  return (data as Invoice[]) ?? [];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch invoice: ${error.message}`);
  }
  return (data as Invoice) ?? null;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = {
    merchant: input.merchant,
    amount: input.amount,
    memo: input.memo,
    processor: input.processor,
    token: input.token,
    chain_id: input.chainId ?? "97",
    invoice_id: input.invoiceId,
    nonce: input.nonce,
    status: "pending",
  };

  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select().single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const { data: existing } = await supabaseAdmin.from(TABLE).select("*").eq("invoice_id", input.invoiceId).maybeSingle();
      if (existing) {
        return existing as Invoice;
      }
    }
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
  if (!data) {
    throw new Error("Failed to create invoice");
  }
  return data as Invoice;
}

export async function settleInvoice(id: string, input: SettleInvoiceInput): Promise<Invoice | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({
      status: "settled",
      tx_hash: input.txHash,
      payer: input.payer,
      settled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to mark invoice settled: ${error.message}`);
  }
  return (data as Invoice) ?? null;
}

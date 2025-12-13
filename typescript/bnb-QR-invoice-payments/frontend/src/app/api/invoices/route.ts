import { NextRequest, NextResponse } from "next/server";
import { createInvoice, listInvoices } from "@/lib/server/invoiceStore";

export async function GET() {
  try {
    const invoices = await listInvoices();
    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant, amount, memo, processor, token, chainId, invoiceId, nonce } = body ?? {};

    if (!merchant || !amount || !processor || !token || !invoiceId || !nonce) {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }

    const invoice = await createInvoice({
      merchant,
      amount,
      memo,
      processor,
      token,
      chainId,
      invoiceId,
      nonce,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON payload";
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

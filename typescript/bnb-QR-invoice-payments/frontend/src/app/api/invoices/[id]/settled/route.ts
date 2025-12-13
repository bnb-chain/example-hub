import { NextRequest, NextResponse } from "next/server";
import { settleInvoice } from "@/lib/server/invoiceStore";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { txHash, payer } = await request.json();
    const { id } = await context.params;
    const invoice = await settleInvoice(id, { txHash, payer });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status });
  }
}

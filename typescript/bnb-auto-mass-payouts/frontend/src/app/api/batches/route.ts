import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { BatchRecord, StoredRecipient } from "@/types/payout";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

type BatchPayload = {
  batchId: string;
  metadataURI: string;
  token: string;
  tokenType: string;
  totalWei: string;
  humanTotal: string;
  count: number;
  txHash: string;
  payer: string;
  chainId: number;
  recipients: StoredRecipient[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { data: [] satisfies BatchRecord[], configured: false },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, configured: true });
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as BatchPayload;

  if (!payload.batchId || !payload.txHash) {
    return NextResponse.json(
      { error: "Missing batchId or transaction hash." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("batches")
    .insert({
      batch_id: payload.batchId,
      metadata_uri: payload.metadataURI,
      token: payload.token,
      token_type: payload.tokenType,
      total_wei: payload.totalWei,
      human_total: payload.humanTotal,
      recipient_count: payload.count,
      tx_hash: payload.txHash,
      payer: payload.payer,
      chain_id: payload.chainId,
      recipients: payload.recipients,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

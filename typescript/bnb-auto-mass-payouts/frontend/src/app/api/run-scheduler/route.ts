import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { massPayoutAbi } from "@/lib/abi/massPayout";
import type { ScheduleRecord } from "@/types/payout";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schedulerPrivateKey = process.env.SCHEDULER_PRIVATE_KEY;
const schedulerRpc =
  process.env.SCHEDULER_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "";
const schedulerToken = process.env.SCHEDULER_WEBHOOK_TOKEN;
const massPayoutAddress = process.env.NEXT_PUBLIC_MASS_PAYOUT_ADDRESS;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

async function fetchDueSchedules() {
  if (!supabase) return [] as ScheduleRecord[];

  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("scheduled_batches")
    .select("*")
    .lte("execute_after", nowIso)
    .eq("executed", false)
    .limit(5);

  return (data ?? []) as ScheduleRecord[];
}

async function markExecuted(scheduleId: string, txHash: string) {
  if (!supabase) return;
  await supabase
    .from("scheduled_batches")
    .update({
      executed: true,
      executed_tx: txHash,
      executed_at: new Date().toISOString(),
    })
    .eq("schedule_id", scheduleId);
}

export async function POST(request: Request) {
  if (schedulerToken) {
    const provided = request.headers.get("x-cron-token");
    if (provided !== schedulerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!supabase || !schedulerPrivateKey || !schedulerRpc || !massPayoutAddress) {
    return NextResponse.json(
      { error: "Scheduler env vars missing." },
      { status: 500 }
    );
  }

  const provider = new JsonRpcProvider(schedulerRpc);
  const wallet = new Wallet(schedulerPrivateKey, provider);
  const contract = new Contract(massPayoutAddress, massPayoutAbi, wallet);

  const due = await fetchDueSchedules();
  if (!due.length) {
    return NextResponse.json({ processed: 0, message: "No due schedules." });
  }

  const processed: { id: string; tx: string }[] = [];
  for (const schedule of due) {
    if (!schedule.recipients?.length) continue;
    const addresses = schedule.recipients.map((recipient) => recipient.address);
    const amounts = schedule.recipients.map((recipient) =>
      BigInt(recipient.amountWei)
    );
    try {
      const tx = await contract.executeScheduled(
        schedule.schedule_id,
        addresses,
        amounts
      );
      const receipt = await tx.wait();
      await markExecuted(schedule.schedule_id, receipt.hash);
      processed.push({ id: schedule.schedule_id, tx: receipt.hash });
    } catch (error) {
      console.error("Scheduler failed", schedule.schedule_id, error);
    }
  }

  return NextResponse.json({ processed });
}

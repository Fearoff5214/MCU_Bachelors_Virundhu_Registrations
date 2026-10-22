import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/email/cron-auth";
import { processOutbox } from "@/lib/email/outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processOutbox(50);
  return NextResponse.json(result);
}

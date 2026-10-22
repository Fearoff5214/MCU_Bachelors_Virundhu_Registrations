import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/email/cron-auth";
import { releaseExpiredHolds } from "@/lib/inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}

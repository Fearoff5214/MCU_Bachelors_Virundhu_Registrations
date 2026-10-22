import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { events } from "@/db/schema";
import { Scanner } from "./scanner";

export const metadata = { title: "Gate scanner" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const list = await db
    .select({ id: events.id, name: events.name, startsAt: events.startsAt })
    .from(events)
    .where(inArray(events.status, ["published", "closed"]))
    .orderBy(desc(events.startsAt));

  return (
    <div className="mx-auto max-w-md pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Gate scanner</h1>
        <Link href="/scan/stats" className="text-sm text-cyan">
          Live stats →
        </Link>
      </div>
      <Scanner events={list.map((e) => ({ id: e.id, name: e.name }))} />
    </div>
  );
}

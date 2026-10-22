import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { events, tickets } from "@/db/schema";
import { AutoRefresh } from "./auto-refresh";

export const metadata = { title: "Gate stats" };
export const dynamic = "force-dynamic";

export default async function ScanStatsPage() {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      issued: sql<number>`count(${tickets.id}) filter (where ${tickets.status} <> 'cancelled')::int`,
      checkedIn: sql<number>`count(${tickets.id}) filter (where ${tickets.status} = 'used')::int`,
    })
    .from(events)
    .leftJoin(tickets, eq(tickets.eventId, events.id))
    .where(inArray(events.status, ["published", "closed"]))
    .groupBy(events.id)
    .orderBy(desc(events.startsAt));

  return (
    <div className="mx-auto max-w-md pt-4">
      <AutoRefresh seconds={10} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Live gate stats</h1>
        <Link href="/scan" className="text-sm text-cyan">
          ← Scanner
        </Link>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = r.issued ? Math.round((r.checkedIn / r.issued) * 100) : 0;
          return (
            <div key={r.id} className="glass rounded-2xl p-5">
              <p className="font-display font-bold">{r.name}</p>
              <p className="mt-2 font-display text-4xl font-black text-lime">
                {r.checkedIn.toLocaleString("en-IN")}
                <span className="text-lg font-semibold text-mute"> / {r.issued.toLocaleString("en-IN")} inside</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-lime" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-mute">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

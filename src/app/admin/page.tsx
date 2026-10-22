import { asc, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { events, orders, ticketTiers, tickets } from "@/db/schema";
import { ButtonLink, Card, Chip, PageTitle } from "@/components/ui";
import { rupees } from "@/lib/format";
import { istDateTime } from "./_lib";

export const dynamic = "force-dynamic";

const statusColor = { draft: "saffron", published: "lime", closed: "magenta" } as const;

export default async function AdminDashboard() {
  const [eventRows, tierRows, revenueRows, checkedInRows] = await Promise.all([
    db.select().from(events).orderBy(desc(events.startsAt)),
    db.select().from(ticketTiers).orderBy(asc(ticketTiers.sortOrder), asc(ticketTiers.name)),
    db
      .select({ eventId: orders.eventId, total: sql<string>`coalesce(sum(${orders.amountPaise}), 0)::bigint` })
      .from(orders)
      .where(eq(orders.status, "paid"))
      .groupBy(orders.eventId),
    db
      .select({ eventId: tickets.eventId, n: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.status, "used"))
      .groupBy(tickets.eventId),
  ]);

  const revenue = new Map(revenueRows.map((r) => [r.eventId, Number(r.total)]));
  const checkedIn = new Map(checkedInRows.map((r) => [r.eventId, r.n]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle kicker="Dashboard">Events</PageTitle>
        <ButtonLink href="/admin/events/new" className="mb-8">
          + New event
        </ButtonLink>
      </div>

      {eventRows.length === 0 && (
        <Card className="p-8 text-center text-mute">No events yet. Create the first one.</Card>
      )}

      <div className="grid gap-5">
        {eventRows.map((ev) => {
          const tiers = tierRows.filter((t) => t.eventId === ev.id);
          const sold = tiers.reduce((s, t) => s + t.sold, 0);
          const cap = tiers.reduce((s, t) => s + t.capacity, 0);
          const held = tiers.reduce((s, t) => s + t.held, 0);
          const inside = checkedIn.get(ev.id) ?? 0;
          return (
            <Card key={ev.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold">{ev.name}</h2>
                    <Chip color={statusColor[ev.status]}>{ev.status}</Chip>
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    {istDateTime(ev.startsAt)} · {ev.venue} · /events/{ev.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/admin/events/${ev.id}`} variant="ghost" className="min-h-9 px-3 text-xs">
                    Edit
                  </ButtonLink>
                  <a
                    href={`/api/admin/export?eventId=${ev.id}`}
                    className="inline-flex min-h-9 items-center rounded-xl border border-line px-3 text-xs hover:border-cyan hover:text-cyan"
                  >
                    Export CSV
                  </a>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Revenue" value={rupees(revenue.get(ev.id) ?? 0)} accent="text-lime" />
                <Stat label="Sold" value={`${sold.toLocaleString("en-IN")} / ${cap.toLocaleString("en-IN")}`} />
                <Stat label="On hold" value={held.toLocaleString("en-IN")} />
                <Stat
                  label="Checked in"
                  value={`${inside.toLocaleString("en-IN")}${sold ? ` (${Math.round((inside / sold) * 100)}%)` : ""}`}
                  accent="text-cyan"
                />
              </dl>

              {tiers.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
                      <tr className="border-b border-line">
                        <th className="py-2 pr-3 font-semibold">Tier</th>
                        <th className="py-2 pr-3 font-semibold">Price</th>
                        <th className="py-2 pr-3 font-semibold">Sold / Cap</th>
                        <th className="py-2 pr-3 font-semibold">Hold</th>
                        <th className="w-1/3 py-2 font-semibold">Fill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => {
                        const pct = t.capacity ? Math.min(100, ((t.sold + t.held) / t.capacity) * 100) : 0;
                        return (
                          <tr key={t.id} className="border-b border-line/50">
                            <td className="py-2 pr-3">{t.name}</td>
                            <td className="py-2 pr-3 tabular-nums">{rupees(t.pricePaise)}</td>
                            <td className="py-2 pr-3 tabular-nums">
                              {t.sold} / {t.capacity}
                            </td>
                            <td className="py-2 pr-3 tabular-nums text-mute">{t.held}</td>
                            <td className="py-2">
                              <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                                <div className="h-full bg-gradient-to-r from-cyan to-magenta" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-saffron">
                  No ticket tiers yet —{" "}
                  <Link className="underline" href={`/admin/events/${ev.id}`}>
                    add one
                  </Link>
                  .
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-night/60 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">{label}</dt>
      <dd className={`mt-0.5 font-display text-lg font-bold tabular-nums ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}

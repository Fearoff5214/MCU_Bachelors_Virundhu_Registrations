import { desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { Button, Card, Chip, Input, PageTitle } from "@/components/ui";
import { rupees } from "@/lib/format";
import { normaliseCode } from "@/lib/qr";
import { RefundButton, ResendButton } from "../_components/forms";
import { istDateTime, UUID_RE } from "../_lib";

export const dynamic = "force-dynamic";

const orderColor = { pending: "saffron", paid: "lime", failed: "magenta", expired: "cyan", refunded: "magenta" } as const;
const ticketColor = { valid: "lime", used: "cyan", cancelled: "magenta" } as const;

async function findOrderIds(q: string): Promise<{ ids: string[]; matchedCode?: string }> {
  if (UUID_RE.test(q)) return { ids: [q] };

  if (q.includes("@")) {
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(ilike(users.email, `%${q.replace(/[%_\\]/g, "\\$&")}%`))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return { ids: rows.map((r) => r.id) };
  }

  const code = normaliseCode(q);
  if (code) {
    const rows = await db.select({ orderId: tickets.orderId }).from(tickets).where(eq(tickets.code, code));
    return { ids: rows.map((r) => r.orderId), matchedCode: code };
  }
  return { ids: [] };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const { ids, matchedCode } = q ? await findOrderIds(q) : { ids: [] as string[] };

  const rows = ids.length
    ? await db
        .select({ order: orders, eventName: events.name, tierName: ticketTiers.name, buyerEmail: users.email, buyerName: users.name })
        .from(orders)
        .innerJoin(events, eq(events.id, orders.eventId))
        .innerJoin(ticketTiers, eq(ticketTiers.id, orders.tierId))
        .innerJoin(users, eq(users.id, orders.userId))
        .where(inArray(orders.id, ids))
        .orderBy(desc(orders.createdAt))
    : [];
  const ticketRows = ids.length
    ? await db.select().from(tickets).where(inArray(tickets.orderId, ids)).orderBy(tickets.code)
    : [];

  return (
    <>
      <PageTitle kicker="Support">Orders</PageTitle>

      <form className="mb-6 flex gap-2" action="/admin/orders">
        <Input name="q" defaultValue={q} placeholder="Buyer email, ticket code (BV-XXXX-XXXX) or order id" autoFocus />
        <Button type="submit" className="shrink-0">
          Search
        </Button>
      </form>

      {q && rows.length === 0 && <Card className="p-6 text-center text-mute">No orders match “{q}”.</Card>}

      <div className="grid gap-4">
        {rows.map(({ order, eventName, tierName, buyerEmail, buyerName }) => {
          const its = ticketRows.filter((t) => t.orderId === order.id);
          return (
            <Card key={order.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold">{eventName}</h2>
                    <Chip color={orderColor[order.status]}>{order.status}</Chip>
                  </div>
                  <p className="mt-1 text-sm">
                    {buyerName ?? "—"} <span className="text-mute">· {buyerEmail}</span>
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-mute">
                    {order.id} · {order.provider}
                    {order.providerOrderId ? ` · ${order.providerOrderId}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold tabular-nums">{rupees(order.amountPaise)}</p>
                  <p className="text-xs text-mute">
                    {order.qty} × {tierName}
                  </p>
                  <p className="text-xs text-mute">{istDateTime(order.paidAt ?? order.createdAt)}</p>
                </div>
              </div>

              {its.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
                      <tr className="border-b border-line">
                        <th className="py-2 pr-3 font-semibold">Code</th>
                        <th className="py-2 pr-3 font-semibold">Status</th>
                        <th className="py-2 font-semibold">Checked in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {its.map((t) => (
                        <tr key={t.id} className={`border-b border-line/50 ${t.code === matchedCode ? "bg-cyan/5" : ""}`}>
                          <td className="py-2 pr-3 font-mono tracking-wider">{t.code}</td>
                          <td className="py-2 pr-3">
                            <Chip color={ticketColor[t.status]}>{t.status}</Chip>
                          </td>
                          <td className="py-2 text-mute">{istDateTime(t.checkedInAt) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {order.status === "paid" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <ResendButton orderId={order.id} />
                  <RefundButton orderId={order.id} amount={rupees(order.amountPaise)} />
                </div>
              )}
              {order.status === "failed" && order.paidAt === null && (
                <p className="mt-3 text-xs text-saffron">
                  If the gateway shows this order as paid, it arrived after the seats sold out and must be refunded at the gateway.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

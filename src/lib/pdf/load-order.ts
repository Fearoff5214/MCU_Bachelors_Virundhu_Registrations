import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { signTicket } from "@/lib/qr";
import type { PdfTicket, RenderTicketsPdfInput } from "./ticket";

export type OrderBundle = {
  order: typeof orders.$inferSelect;
  buyer: { name: string | null; email: string | null };
  event: typeof events.$inferSelect;
  tierName: string;
  tickets: (PdfTicket & { id: string })[];
};

/** Loads everything needed to render/send an order's tickets. Only valid + used tickets are included. */
export async function loadOrderBundle(orderId: string, opts: { ticketId?: string } = {}): Promise<OrderBundle | null> {
  const [row] = await db
    .select({ order: orders, event: events, tierName: ticketTiers.name, buyerName: users.name, buyerEmail: users.email })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(ticketTiers, eq(ticketTiers.id, orders.tierId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId));
  if (!row) return null;

  const conditions = [eq(tickets.orderId, orderId), inArray(tickets.status, ["valid", "used"])];
  if (opts.ticketId) conditions.push(eq(tickets.id, opts.ticketId));

  const rows = await db
    .select({ id: tickets.id, code: tickets.code, status: tickets.status })
    .from(tickets)
    .where(and(...conditions))
    .orderBy(asc(tickets.createdAt), asc(tickets.code));

  const holderName = row.buyerName || row.buyerEmail || "Guest";

  return {
    order: row.order,
    buyer: { name: row.buyerName, email: row.buyerEmail },
    event: row.event,
    tierName: row.tierName,
    tickets: rows.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      tierName: row.tierName,
      holderName,
      qrToken: signTicket(t.id),
    })),
  };
}

export function toPdfInput(bundle: OrderBundle): RenderTicketsPdfInput {
  return {
    event: { name: bundle.event.name, venue: bundle.event.venue, startsAt: bundle.event.startsAt },
    tickets: bundle.tickets,
  };
}

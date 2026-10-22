import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { qrDataUrl, signTicket } from "@/lib/qr";

export type TicketView = Awaited<ReturnType<typeof loadTickets>>[number];

async function loadTickets(where: ReturnType<typeof and>) {
  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
      orderId: tickets.orderId,
      tierName: ticketTiers.name,
      eventName: events.name,
      eventSlug: events.slug,
      venue: events.venue,
      startsAt: events.startsAt,
      holder: users.name,
    })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(ticketTiers, eq(ticketTiers.id, tickets.tierId))
    .innerJoin(users, eq(users.id, tickets.userId))
    .where(where)
    .orderBy(asc(events.startsAt), asc(tickets.createdAt));

  return Promise.all(rows.map(async (r) => ({ ...r, qr: await qrDataUrl(signTicket(r.id), 480) })));
}

export function ticketsForUser(userId: string) {
  return loadTickets(and(eq(tickets.userId, userId)));
}

export async function ticketForUser(userId: string, ticketId: string) {
  const [t] = await loadTickets(and(eq(tickets.userId, userId), eq(tickets.id, ticketId)));
  return t ?? null;
}

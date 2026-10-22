import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { scanLog, ticketTiers, tickets, users } from "@/db/schema";
import { normaliseCode, verifyTicketToken } from "@/lib/qr";

export type ScanResponse =
  | { result: "valid"; code: string; holder: string | null; tier: string }
  | { result: "already_used"; code: string; holder: string | null; tier: string; checkedInAt: string; checkedInBy: string | null }
  | { result: "cancelled"; code: string; holder: string | null; tier: string }
  | { result: "wrong_event"; code: string; holder: string | null; tier: string }
  | { result: "invalid" };

/**
 * Verifies a scanned QR token (or a hand-typed code) and checks the ticket in exactly once.
 * The status flip is a single conditional UPDATE, so two gates scanning the same QR at the
 * same moment cannot both get "valid".
 */
export async function checkIn(input: { token?: string; code?: string; eventId: string; staffId: string }): Promise<ScanResponse> {
  let ticketId: string | null = null;
  if (input.token) {
    ticketId = verifyTicketToken(input.token);
  } else if (input.code) {
    const code = normaliseCode(input.code);
    if (code) {
      const [row] = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.code, code));
      ticketId = row?.id ?? null;
    }
  }

  if (!ticketId) {
    await db.insert(scanLog).values({ staffId: input.staffId, result: "invalid" });
    return { result: "invalid" };
  }

  const [checked] = await db
    .update(tickets)
    .set({ status: "used", checkedInAt: new Date(), checkedInBy: input.staffId })
    .where(and(eq(tickets.id, ticketId), eq(tickets.status, "valid"), eq(tickets.eventId, input.eventId)))
    .returning({ id: tickets.id });

  const staff = alias(users, "staff");
  const holder = alias(users, "holder");
  const [t] = await db
    .select({
      code: tickets.code,
      status: tickets.status,
      eventId: tickets.eventId,
      checkedInAt: tickets.checkedInAt,
      tier: ticketTiers.name,
      holder: holder.name,
      staffName: staff.name,
      staffEmail: staff.email,
    })
    .from(tickets)
    .innerJoin(ticketTiers, eq(ticketTiers.id, tickets.tierId))
    .innerJoin(holder, eq(holder.id, tickets.userId))
    .leftJoin(staff, eq(staff.id, tickets.checkedInBy))
    .where(eq(tickets.id, ticketId));

  if (!t) {
    // Genuine signature but ticket row missing (e.g. wiped DB). Treat as invalid.
    await db.insert(scanLog).values({ staffId: input.staffId, result: "invalid" });
    return { result: "invalid" };
  }

  const base = { code: t.code, holder: t.holder, tier: t.tier };
  let response: ScanResponse;
  if (checked) response = { result: "valid", ...base };
  else if (t.eventId !== input.eventId) response = { result: "wrong_event", ...base };
  else if (t.status === "cancelled") response = { result: "cancelled", ...base };
  else
    response = {
      result: "already_used",
      ...base,
      checkedInAt: t.checkedInAt?.toISOString() ?? "",
      checkedInBy: t.staffName ?? t.staffEmail ?? null,
    };

  await db.insert(scanLog).values({
    ticketId,
    staffId: input.staffId,
    result: response.result === "wrong_event" ? "invalid" : response.result,
  });
  return response;
}

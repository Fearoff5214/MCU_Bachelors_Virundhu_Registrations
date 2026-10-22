import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, ticketTiers, tickets, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const istFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

function csvField(v: string | null | undefined) {
  let s = v ?? "";
  // Neutralise spreadsheet formula injection from user-controlled names.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  if (!(await requireRole("admin"))) return new Response("Forbidden", { status: 403 });

  const eventId = new URL(req.url).searchParams.get("eventId") ?? "";
  if (!UUID_RE.test(eventId)) return new Response("eventId required", { status: 400 });

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
  if (!event) return new Response("Event not found", { status: 404 });

  const rows = await db
    .select({
      code: tickets.code,
      tier: ticketTiers.name,
      name: users.name,
      email: users.email,
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
      orderId: tickets.orderId,
    })
    .from(tickets)
    .innerJoin(ticketTiers, eq(ticketTiers.id, tickets.tierId))
    .innerJoin(users, eq(users.id, tickets.userId))
    .where(eq(tickets.eventId, eventId))
    .orderBy(asc(ticketTiers.sortOrder), asc(tickets.createdAt));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // BOM so Excel opens UTF-8 (Tamil names) correctly.
      controller.enqueue(encoder.encode("﻿code,tier,buyer_name,buyer_email,status,checked_in_at_ist,order_id\r\n"));
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const lines = rows
          .slice(i, i + CHUNK)
          .map((r) =>
            [
              r.code,
              r.tier,
              r.name,
              r.email,
              r.status,
              r.checkedInAt ? istFmt.format(r.checkedInAt) : "",
              r.orderId,
            ]
              .map(csvField)
              .join(","),
          )
          .join("\r\n");
        controller.enqueue(encoder.encode(lines + "\r\n"));
      }
      controller.close();
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-attendees-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

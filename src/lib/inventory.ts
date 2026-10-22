import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox, events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { generateTicketCode } from "@/lib/qr";

export const HOLD_MINUTES = 10;

export type ReserveResult =
  | { ok: true; orderId: string; amountPaise: number }
  | { ok: false; reason: "not_on_sale" | "sold_out" | "limit_reached" | "bad_request"; message: string };

/**
 * Holds seats for a user for HOLD_MINUTES. Safe under heavy concurrency:
 * the hold is one conditional UPDATE, so Postgres serialises competing buyers on the tier row
 * and the CHECK constraint on ticket_tiers is a second line of defence.
 */
export async function reserveSeats(params: {
  userId: string;
  tierId: string;
  qty: number;
  provider: string;
}): Promise<ReserveResult> {
  const { userId, tierId, qty, provider } = params;
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    return { ok: false, reason: "bad_request", message: "Invalid quantity" };
  }

  return db.transaction(async (tx) => {
    const [tier] = await tx
      .select({ tier: ticketTiers, event: events })
      .from(ticketTiers)
      .innerJoin(events, eq(events.id, ticketTiers.eventId))
      .where(eq(ticketTiers.id, tierId));
    if (!tier) return { ok: false, reason: "bad_request", message: "Ticket type not found" } as const;

    const now = new Date();
    const { event } = tier;
    if (
      event.status !== "published" ||
      (event.salesOpenAt && event.salesOpenAt > now) ||
      (event.salesCloseAt && event.salesCloseAt < now)
    ) {
      return { ok: false, reason: "not_on_sale", message: "Sales are not open for this event" } as const;
    }

    // Serialise this user's own checkouts so parallel requests can't bypass max_per_user.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

    const [{ owned }] = await tx
      .select({ owned: sql<number>`coalesce(sum(${orders.qty}), 0)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.tierId, tierId),
          sql`(${orders.status} = 'paid' OR (${orders.status} = 'pending' AND ${orders.expiresAt} > now()))`,
        ),
      );
    if (owned + qty > tier.tier.maxPerUser) {
      return {
        ok: false,
        reason: "limit_reached",
        message: `Max ${tier.tier.maxPerUser} per person for this ticket type`,
      } as const;
    }

    const held = await tx
      .update(ticketTiers)
      .set({ held: sql`${ticketTiers.held} + ${qty}` })
      .where(and(eq(ticketTiers.id, tierId), sql`${ticketTiers.sold} + ${ticketTiers.held} + ${qty} <= ${ticketTiers.capacity}`))
      .returning({ id: ticketTiers.id });
    if (held.length === 0) return { ok: false, reason: "sold_out", message: "Housefull" } as const;

    const amountPaise = tier.tier.pricePaise * qty;
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        eventId: event.id,
        tierId,
        qty,
        amountPaise,
        provider,
        expiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
      })
      .returning({ id: orders.id });

    return { ok: true, orderId: order.id, amountPaise } as const;
  });
}

export type ConfirmResult =
  | { status: "issued"; orderId: string }
  | { status: "already_processed"; orderId: string }
  | { status: "needs_refund"; orderId: string }
  | { status: "not_found" };

/**
 * Called only after the payment provider has verified the payment (webhook / server-side check).
 * Idempotent: replays of the same webhook are no-ops.
 */
export async function confirmPayment(provider: string, providerOrderId: string): Promise<ConfirmResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.provider, provider), eq(orders.providerOrderId, providerOrderId)))
      .for("update");
    if (!order) return { status: "not_found" } as const;
    if (order.status === "paid" || order.status === "refunded") {
      return { status: "already_processed", orderId: order.id } as const;
    }

    if (order.status === "pending") {
      // Normal path: convert our hold into a sale.
      await tx
        .update(ticketTiers)
        .set({ held: sql`${ticketTiers.held} - ${order.qty}`, sold: sql`${ticketTiers.sold} + ${order.qty}` })
        .where(eq(ticketTiers.id, order.tierId));
    } else {
      // Paid after the hold expired (or after a failure). Seats were released, so try to grab them again.
      const grabbed = await tx
        .update(ticketTiers)
        .set({ sold: sql`${ticketTiers.sold} + ${order.qty}` })
        .where(
          and(
            eq(ticketTiers.id, order.tierId),
            sql`${ticketTiers.sold} + ${ticketTiers.held} + ${order.qty} <= ${ticketTiers.capacity}`,
          ),
        )
        .returning({ id: ticketTiers.id });
      if (grabbed.length === 0) {
        // Money taken but no seats left: flag for refund instead of overselling.
        await tx.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
        console.error(`[inventory] order ${order.id} paid after expiry with no seats left — REFUND REQUIRED`);
        return { status: "needs_refund", orderId: order.id } as const;
      }
    }

    await tx.update(orders).set({ status: "paid", paidAt: new Date() }).where(eq(orders.id, order.id));

    for (let i = 0; i < order.qty; i++) {
      // Codes come from a 31^8 space; retry on the rare collision.
      for (let attempt = 0; ; attempt++) {
        const inserted = await tx
          .insert(tickets)
          .values({
            code: generateTicketCode(),
            orderId: order.id,
            userId: order.userId,
            eventId: order.eventId,
            tierId: order.tierId,
          })
          .onConflictDoNothing({ target: tickets.code })
          .returning({ id: tickets.id });
        if (inserted.length) break;
        if (attempt > 5) throw new Error("Could not generate a unique ticket code");
      }
    }

    const [buyer] = await tx.select({ email: users.email }).from(users).where(eq(users.id, order.userId));
    if (buyer?.email) await tx.insert(emailOutbox).values({ orderId: order.id, to: buyer.email });

    return { status: "issued", orderId: order.id } as const;
  });
}

/** Payment failed or the buyer cancelled: free the seats immediately instead of waiting for expiry. */
export async function releaseOrder(orderId: string, status: "failed" | "expired" = "failed") {
  await db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning();
    if (!order) return;
    await tx
      .update(ticketTiers)
      .set({ held: sql`${ticketTiers.held} - ${order.qty}` })
      .where(eq(ticketTiers.id, order.tierId));
  });
}

/** Cron sweep: expire stale holds and return the seats, in a single atomic statement. */
export async function releaseExpiredHolds(): Promise<number> {
  const rows = await db.execute<{ released: number }>(sql`
    WITH expired AS (
      UPDATE orders SET status = 'expired'
      WHERE status = 'pending' AND expires_at < now()
      RETURNING tier_id, qty
    ), per_tier AS (
      SELECT tier_id, sum(qty)::int AS qty FROM expired GROUP BY tier_id
    ), upd AS (
      UPDATE ticket_tiers t SET held = t.held - p.qty
      FROM per_tier p WHERE t.id = p.tier_id
      RETURNING p.qty
    )
    SELECT coalesce(sum(qty), 0)::int AS released FROM upd
  `);
  return Number(rows[0]?.released ?? 0);
}

/**
 * Proves the inventory can't be oversold under a rush.
 * Fires BUYERS concurrent reservations at a tier with CAPACITY seats, confirms half of the winners,
 * expires the rest, and checks the counters add up. Run against a STAGING database only:
 *   npm run loadtest:oversell
 */
import "dotenv/config";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { confirmPayment, releaseExpiredHolds, reserveSeats } from "@/lib/inventory";

const BUYERS = Number(process.env.BUYERS ?? 2000);
const CAPACITY = Number(process.env.CAPACITY ?? 500);

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run against production");
  process.env.QR_SECRET ??= "loadtest-secret-loadtest-secret-loadtest";

  const run = Date.now().toString(36);
  const [event] = await db
    .insert(events)
    .values({ slug: `loadtest-${run}`, name: `Load test ${run}`, venue: "Test", startsAt: new Date(Date.now() + 86400_000), status: "published" })
    .returning();
  const [tier] = await db
    .insert(ticketTiers)
    .values({ eventId: event.id, name: "Test", pricePaise: 100, capacity: CAPACITY, maxPerUser: 1 })
    .returning();

  const buyerRows = await db
    .insert(users)
    .values(Array.from({ length: BUYERS }, (_, i) => ({ email: `loadtest-${run}-${i}@example.test`, name: `Buyer ${i}` })))
    .returning({ id: users.id });

  console.log(`Firing ${BUYERS} concurrent checkouts at ${CAPACITY} seats…`);
  const t0 = performance.now();
  const results = await Promise.all(
    buyerRows.map((u) => reserveSeats({ userId: u.id, tierId: tier.id, qty: 1, provider: "mock" }).catch((e) => ({ ok: false as const, reason: "error", message: String(e) }))),
  );
  const ms = Math.round(performance.now() - t0);

  const won = results.filter((r) => r.ok);
  const errors = results.filter((r) => !r.ok && r.reason === "error");
  console.log(`  ${won.length} holds, ${results.length - won.length - errors.length} sold out, ${errors.length} errors in ${ms} ms`);

  // Pay for half the winners, let the rest expire.
  const pay = won.slice(0, Math.floor(won.length / 2));
  for (const r of pay) {
    if (!r.ok) continue;
    await db.update(orders).set({ providerOrderId: `mock_${r.orderId}` }).where(eq(orders.id, r.orderId));
  }
  await Promise.all(pay.map((r) => r.ok && confirmPayment("mock", `mock_${r.orderId}`)));
  // Replay the same webhooks to prove idempotency.
  await Promise.all(pay.map((r) => r.ok && confirmPayment("mock", `mock_${r.orderId}`)));

  await db.update(orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(orders.status, "pending"));
  const released = await releaseExpiredHolds();

  const [after] = await db.select().from(ticketTiers).where(eq(ticketTiers.id, tier.id));
  const [{ count }] = await db.$count(tickets, eq(tickets.tierId, tier.id)).then((c) => [{ count: c }]);

  const checks = {
    "holds == capacity": won.length === CAPACITY,
    "no errors": errors.length === 0,
    "sold == paid orders": after.sold === pay.length,
    "tickets == paid orders (idempotent webhooks)": count === pay.length,
    "held == 0 after expiry": after.held === 0,
    "released == unpaid holds": released === won.length - pay.length,
  };
  console.table(checks);

  // Clean up
  await db.delete(tickets).where(eq(tickets.tierId, tier.id));
  await db.delete(orders).where(eq(orders.tierId, tier.id));
  await db.delete(events).where(eq(events.id, event.id));
  await db.delete(users).where(like(users.email, `loadtest-${run}-%`));
  void inArray;

  const ok = Object.values(checks).every(Boolean);
  console.log(ok ? "PASS ✅" : "FAIL ❌");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

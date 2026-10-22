import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { events, orders, ticketTiers } from "@/db/schema";
import { T } from "@/components/copy";
import { HoldCountdown } from "@/components/countdown";
import { Button, ButtonLink, Card, PageTitle } from "@/components/ui";
import { auth } from "@/lib/auth";
import { eventDate, rupees } from "@/lib/format";
import { mockPaymentsAllowed } from "@/lib/payments/mock";
import { cancelCheckout, payWithMock } from "../actions";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/signin?callbackUrl=/checkout/${orderId}`);
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const [row] = await db
    .select({ order: orders, event: events, tier: ticketTiers })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(ticketTiers, eq(ticketTiers.id, orders.tierId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id)));
  if (!row) notFound();
  const { order, event, tier } = row;

  if (order.status === "paid") redirect(`/tickets?new=${order.id}`);

  const expired = order.status !== "pending" || order.expiresAt < new Date();

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle kicker="Checkout">{event.name}</PageTitle>

      <Card className="holo-border space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold">
              {tier.name} × {order.qty}
            </p>
            <p className="text-sm text-mute">{eventDate(event.startsAt)}</p>
            <p className="text-sm text-mute">{event.venue}</p>
          </div>
          <p className="font-display text-2xl font-bold text-lime">{rupees(order.amountPaise)}</p>
        </div>

        {expired ? (
          <>
            <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              <T k="holdExpired" />
            </p>
            <ButtonLink href={`/events/${event.slug}`} className="w-full">
              Back to event
            </ButtonLink>
          </>
        ) : (
          <>
            <HoldCountdown expiresAt={order.expiresAt.toISOString()} />

            {order.provider === "mock" ? (
              mockPaymentsAllowed() ? (
                <form action={payWithMock.bind(null, order.id)}>
                  <Button type="submit" className="w-full">
                    <T k="pay" /> · {rupees(order.amountPaise)} (test mode)
                  </Button>
                  <p className="mt-2 text-center text-xs text-mute">
                    Test payment: no money is charged. The real gateway plugs in here.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-danger">Payments are not configured yet.</p>
              )
            ) : (
              // Real gateway checkout widget goes here (e.g. Razorpay Checkout using order.providerOrderId).
              <p className="text-sm text-mute">Loading payment…</p>
            )}

            <form action={cancelCheckout.bind(null, order.id)}>
              <button className="w-full py-2 text-sm text-mute underline-offset-4 hover:text-ink hover:underline">
                Cancel and release seats
              </button>
            </form>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-mute">
        Having trouble? Your seats are held for 10 minutes. <Link href="/tickets" className="text-cyan">My Tickets</Link>
      </p>
    </div>
  );
}

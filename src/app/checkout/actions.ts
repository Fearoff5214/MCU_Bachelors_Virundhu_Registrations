"use server";

import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { auth } from "@/lib/auth";
import { confirmPayment, releaseOrder, reserveSeats } from "@/lib/inventory";
import { activeProvider } from "@/lib/payments";
import { mockPaymentsAllowed } from "@/lib/payments/mock";
import { processOutbox } from "@/lib/email/outbox";

const startSchema = z.object({ tierId: z.uuid(), qty: z.coerce.number().int().min(1).max(10), slug: z.string() });

export type StartCheckoutState = { error?: string };

export async function startCheckout(_prev: StartCheckoutState, form: FormData): Promise<StartCheckoutState> {
  const parsed = startSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please pick a ticket type" };
  const { tierId, qty, slug } = parsed.data;

  const session = await auth();
  if (!session?.user) redirect(`/signin?callbackUrl=${encodeURIComponent(`/events/${slug}`)}`);

  const provider = activeProvider();
  const result = await reserveSeats({ userId: session.user.id, tierId, qty, provider: provider.name });
  if (!result.ok) return { error: result.message };

  try {
    const created = await provider.createOrder({
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      description: `Bachelors Virundhu × ${qty}`,
      customer: { name: session.user.name, email: session.user.email },
    });
    await db.update(orders).set({ providerOrderId: created.providerOrderId }).where(eq(orders.id, result.orderId));
  } catch (err) {
    console.error("[checkout] provider createOrder failed", err);
    await releaseOrder(result.orderId);
    return { error: "Payment gateway is busy. Please try again." };
  }

  revalidateTag("events");
  redirect(`/checkout/${result.orderId}`);
}

async function ownPendingOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, session.user.id)));
  return order;
}

export async function cancelCheckout(orderId: string) {
  const order = await ownPendingOrder(orderId);
  if (order?.status === "pending") {
    await releaseOrder(order.id);
    revalidateTag("events");
  }
  redirect("/");
}

/** Test-only payment. Never available in production unless ALLOW_MOCK_PAYMENTS=true. */
export async function payWithMock(orderId: string) {
  if (!mockPaymentsAllowed()) throw new Error("Mock payments are disabled");
  const order = await ownPendingOrder(orderId);
  if (!order || order.provider !== "mock" || !order.providerOrderId) redirect("/");

  const result = await confirmPayment("mock", order.providerOrderId);
  if (result.status === "issued") {
    revalidateTag("events");
    // Send right away instead of waiting for the next cron tick; the cron retries on failure.
    after(() => processOutbox(5).catch((e) => console.error("[checkout] immediate email send failed", e)));
  }
  redirect(`/tickets?new=${order.id}`);
}

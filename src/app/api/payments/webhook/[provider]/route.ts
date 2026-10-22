import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { processOutbox } from "@/lib/email/outbox";
import { confirmPayment, releaseOrder } from "@/lib/inventory";
import { getProvider } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gateway → us. The provider adapter verifies the signature; nothing from the browser is trusted. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await params;
  const provider = getProvider(name);
  if (!provider) return new Response("unknown provider", { status: 404 });

  const outcome = await provider.verifyWebhook(req);
  // Ack unknown/irrelevant events with 200 so the gateway doesn't retry forever.
  if (!outcome) return Response.json({ ok: true, ignored: true });

  if (outcome.status === "paid") {
    const result = await confirmPayment(name, outcome.providerOrderId);
    if (result.status === "issued") {
      revalidateTag("events");
      after(() => processOutbox(5).catch((e) => console.error("[webhook] immediate email send failed", e)));
    }
    return Response.json({ ok: true, result: result.status });
  }

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.provider, name), eq(orders.providerOrderId, outcome.providerOrderId)));
  if (order) {
    await releaseOrder(order.id);
    revalidateTag("events");
  }
  return Response.json({ ok: true });
}

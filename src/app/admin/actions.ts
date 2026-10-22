"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { emailOutbox, events, orders, ticketTiers, tickets, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/payments";
import { parseIST, slugify } from "./_lib";

export type ActionState = { error?: string; ok?: string } | null;

function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

function firstIssue(e: z.ZodError) {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}

function revalidateEvent(slug?: string) {
  revalidateTag("events");
  revalidatePath("/");
  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/admin", "layout");
}

async function adminOrError() {
  const session = await requireRole("admin");
  if (!session) throw new Error("Not authorised");
  return session;
}

// ---------- Events ----------

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => v || null);

const eventSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional(),
  tagline: optionalText,
  description: z.string().trim().max(10000).default(""),
  venue: z.string().trim().min(1).max(200),
  startsAt: z.string().min(1, "Start time is required"),
  bannerUrl: z.union([z.literal(""), z.url()]).optional(),
  vibeTags: z.string().optional(),
  salesOpenAt: z.string().optional(),
  salesCloseAt: z.string().optional(),
  status: z.enum(["draft", "published", "closed"]),
});

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await adminOrError();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const input = parsed.data;

  const slug = slugify(input.slug || input.name);
  if (!slug) return { error: "slug: could not generate a slug from the name" };

  let startsAt: Date, salesOpenAt: Date | null, salesCloseAt: Date | null;
  try {
    startsAt = parseIST(input.startsAt)!;
    salesOpenAt = parseIST(input.salesOpenAt);
    salesCloseAt = parseIST(input.salesCloseAt);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (salesOpenAt && salesCloseAt && salesCloseAt <= salesOpenAt) {
    return { error: "Sales close must be after sales open" };
  }

  const values = {
    name: input.name,
    slug,
    tagline: input.tagline,
    description: input.description,
    venue: input.venue,
    startsAt,
    bannerUrl: input.bannerUrl || null,
    vibeTags: (input.vibeTags ?? "")
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 8),
    salesOpenAt,
    salesCloseAt,
    status: input.status,
  };

  let newId: string | null = null;
  try {
    if (input.id) {
      const [old] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, input.id));
      if (!old) return { error: "Event not found" };
      await db.update(events).set(values).where(eq(events.id, input.id));
      if (old.slug !== slug) revalidateEvent(old.slug);
    } else {
      const [row] = await db.insert(events).values(values).returning({ id: events.id });
      newId = row.id;
    }
  } catch (e) {
    if (pgCode(e) === "23505") return { error: `Slug "${slug}" is already used by another event` };
    throw e;
  }

  revalidateEvent(slug);
  if (newId) redirect(`/admin/events/${newId}`);
  return { ok: "Saved" };
}

// ---------- Tiers ----------

const tierSchema = z.object({
  tierId: z.union([z.literal(""), z.uuid()]).optional(),
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  description: optionalText,
  price: z.coerce.number().min(0).max(1_000_000),
  capacity: z.coerce.number().int().min(1).max(100_000),
  // reserveSeats() caps a single checkout at 10.
  maxPerUser: z.coerce.number().int().min(1).max(10),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export async function saveTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await adminOrError();
  const parsed = tierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const t = parsed.data;

  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, t.eventId));
  if (!event) return { error: "Event not found" };

  const values = {
    name: t.name,
    description: t.description,
    pricePaise: Math.round(t.price * 100),
    capacity: t.capacity,
    maxPerUser: t.maxPerUser,
    sortOrder: t.sortOrder,
  };

  if (t.tierId) {
    // Conditional update: capacity may never drop below what's already sold or held.
    const updated = await db
      .update(ticketTiers)
      .set(values)
      .where(
        and(
          eq(ticketTiers.id, t.tierId),
          eq(ticketTiers.eventId, t.eventId),
          sql`${ticketTiers.sold} + ${ticketTiers.held} <= ${t.capacity}`,
        ),
      )
      .returning({ id: ticketTiers.id });
    if (!updated.length) {
      const [cur] = await db
        .select({ sold: ticketTiers.sold, held: ticketTiers.held })
        .from(ticketTiers)
        .where(eq(ticketTiers.id, t.tierId));
      if (!cur) return { error: "Tier not found" };
      return { error: `Capacity can't be below ${cur.sold + cur.held} (sold ${cur.sold} + on hold ${cur.held})` };
    }
  } else {
    await db.insert(ticketTiers).values({ ...values, eventId: t.eventId });
  }

  revalidateEvent(event.slug);
  return { ok: t.tierId ? "Tier updated" : "Tier added" };
}

export async function deleteTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await adminOrError();
  const tierId = z.uuid().safeParse(formData.get("tierId"));
  if (!tierId.success) return { error: "Invalid tier" };

  const [tier] = await db
    .select({ tier: ticketTiers, slug: events.slug })
    .from(ticketTiers)
    .innerJoin(events, eq(events.id, ticketTiers.eventId))
    .where(eq(ticketTiers.id, tierId.data));
  if (!tier) return { error: "Tier not found" };

  const [{ n }] = await db.select({ n: count() }).from(orders).where(eq(orders.tierId, tierId.data));
  if (tier.tier.sold > 0 || tier.tier.held > 0 || n > 0) {
    return { error: "This tier has orders and can't be deleted. Reduce its capacity or close the event instead." };
  }

  await db
    .delete(ticketTiers)
    .where(and(eq(ticketTiers.id, tierId.data), eq(ticketTiers.sold, 0), eq(ticketTiers.held, 0)));
  revalidateEvent(tier.slug);
  return { ok: "Tier deleted" };
}

// ---------- Orders ----------

export async function resendEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await adminOrError();
  const orderId = z.uuid().safeParse(formData.get("orderId"));
  if (!orderId.success) return { error: "Invalid order" };

  const [row] = await db
    .select({ status: orders.status, email: users.email })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId.data));
  if (!row) return { error: "Order not found" };
  if (row.status !== "paid") return { error: "Only paid orders have tickets to send" };
  if (!row.email) return { error: "Buyer has no email address" };

  await db.insert(emailOutbox).values({ orderId: orderId.data, to: row.email });
  return { ok: `Queued to ${row.email}` };
}

export async function refundOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await adminOrError();
  const orderId = z.uuid().safeParse(formData.get("orderId"));
  if (!orderId.success) return { error: "Invalid order" };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId.data));
  if (!order) return { error: "Order not found" };
  if (order.status !== "paid") return { error: `Order is ${order.status}, only paid orders can be refunded` };

  const provider = getProvider(order.provider);
  if (provider?.refund && order.providerOrderId) {
    try {
      await provider.refund(order.providerOrderId, order.amountPaise);
    } catch (e) {
      return { error: `Gateway refund failed: ${(e as Error).message}. Nothing was changed.` };
    }
  }

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx
      .update(orders)
      .set({ status: "refunded" })
      .where(and(eq(orders.id, order.id), eq(orders.status, "paid")))
      .returning({ id: orders.id });
    if (!locked) return { error: "Order was changed by someone else, refresh and retry" };

    // Tickets already used at the gate stay counted as sold; only unused seats go back on sale.
    const freed = await tx
      .update(tickets)
      .set({ status: "cancelled" })
      .where(and(eq(tickets.orderId, order.id), eq(tickets.status, "valid")))
      .returning({ id: tickets.id });
    await tx
      .update(tickets)
      .set({ status: "cancelled" })
      .where(and(eq(tickets.orderId, order.id), eq(tickets.status, "used")));

    if (freed.length) {
      await tx
        .update(ticketTiers)
        .set({ sold: sql`${ticketTiers.sold} - ${freed.length}` })
        .where(eq(ticketTiers.id, order.tierId));
    }
    return { freed: freed.length };
  });
  if ("error" in result) return { error: result.error };

  const [ev] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, order.eventId));
  revalidateEvent(ev?.slug);
  const manual = provider?.refund ? "" : " Refund the money manually at the gateway.";
  return { ok: `Refunded. ${result.freed} seat(s) back on sale.${manual}` };
}

// ---------- Staff ----------

const roleSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  role: z.enum(["buyer", "staff", "admin"]),
});

export async function setRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await adminOrError();
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { email, role } = parsed.data;

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`);
  if (!target) return { error: `${email} hasn't signed in yet. Ask them to sign in with Google once, then try again.` };
  if (target.id === session.user.id && role !== "admin") return { error: "You can't demote yourself" };

  await db.update(users).set({ role }).where(eq(users.id, target.id));
  revalidatePath("/admin/staff");
  return { ok: `${email} is now ${role}` };
}

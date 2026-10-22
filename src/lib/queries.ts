import { and, asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { events, ticketTiers } from "@/db/schema";

// Public event data is cached for a few seconds so a sales-open rush mostly hits the cache,
// not Postgres. Availability may lag by up to CACHE_SECONDS; reserveSeats() is the source of truth.
const CACHE_SECONDS = 10;

export type PublicTier = {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  maxPerUser: number;
  available: number;
  capacity: number;
};

function toPublicTier(t: typeof ticketTiers.$inferSelect): PublicTier {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    pricePaise: t.pricePaise,
    maxPerUser: t.maxPerUser,
    capacity: t.capacity,
    available: Math.max(0, t.capacity - t.sold - t.held),
  };
}

export const getPublishedEvents = unstable_cache(
  async () => {
    const rows = await db
      .select()
      .from(events)
      .where(inArray(events.status, ["published", "closed"]))
      .orderBy(asc(events.startsAt));
    if (rows.length === 0) return [];
    const tiers = await db
      .select()
      .from(ticketTiers)
      .where(inArray(ticketTiers.eventId, rows.map((e) => e.id)))
      .orderBy(asc(ticketTiers.sortOrder), asc(ticketTiers.pricePaise));
    return rows.map((e) => ({ ...e, tiers: tiers.filter((t) => t.eventId === e.id).map(toPublicTier) }));
  },
  ["published-events"],
  { revalidate: CACHE_SECONDS, tags: ["events"] },
);

export const getEventBySlug = unstable_cache(
  async (slug: string) => {
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), inArray(events.status, ["published", "closed"])));
    if (!event) return null;
    const tiers = await db
      .select()
      .from(ticketTiers)
      .where(eq(ticketTiers.eventId, event.id))
      .orderBy(asc(ticketTiers.sortOrder), asc(ticketTiers.pricePaise));
    return { ...event, tiers: tiers.map(toPublicTier) };
  },
  ["event-by-slug"],
  { revalidate: CACHE_SECONDS, tags: ["events"] },
);

export type SalesState = "open" | "not_open" | "closed" | "sold_out";

export function salesState(
  event: { status: string; salesOpenAt: Date | string | null; salesCloseAt: Date | string | null },
  tiers: PublicTier[],
  now = new Date(),
): SalesState {
  // unstable_cache serialises Dates to strings, so normalise.
  const open = event.salesOpenAt ? new Date(event.salesOpenAt) : null;
  const close = event.salesCloseAt ? new Date(event.salesCloseAt) : null;
  if (event.status === "closed" || (close && close < now)) return "closed";
  if (open && open > now) return "not_open";
  if (tiers.every((t) => t.available === 0)) return "sold_out";
  return "open";
}

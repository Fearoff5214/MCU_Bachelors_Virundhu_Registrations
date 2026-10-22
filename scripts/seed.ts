/**
 * Creates a sample published event so the site has something to show.
 *   npm run db:seed
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, ticketTiers } from "@/db/schema";

async function main() {
  const slug = "bachelors-virundhu-2026";
  const [existing] = await db.select().from(events).where(eq(events.slug, slug));
  if (existing) {
    console.log(`Event "${slug}" already exists — nothing to do.`);
    process.exit(0);
  }

  const startsAt = new Date(Date.now() + 30 * 24 * 3600_000);
  startsAt.setUTCHours(13, 30, 0, 0); // 7:00 PM IST

  const [event] = await db
    .insert(events)
    .values({
      slug,
      name: "Bachelors Virundhu 2026",
      tagline: "Oru naal, full vibe. Kovai's biggest bachelor night.",
      description:
        "Live DJ, unlimited virundhu (biryani + parotta counters), stand-up from local comics and a midnight filter-coffee bar.\n\nEntry by QR only. Carry a valid ID. 18+.",
      venue: "CODISSIA Trade Fair Complex, Coimbatore",
      startsAt,
      vibeTags: ["DJ-night", "virundhu", "standup"],
      status: "published",
    })
    .returning();

  await db.insert(ticketTiers).values([
    { eventId: event.id, name: "Early Bird", description: "Limited first batch", pricePaise: 49900, capacity: 2000, maxPerUser: 4, sortOrder: 0 },
    { eventId: event.id, name: "General", description: "Entry + virundhu", pricePaise: 79900, capacity: 8000, maxPerUser: 6, sortOrder: 1 },
    { eventId: event.id, name: "VIP Lounge", description: "Fast-track entry, lounge seating, welcome drink", pricePaise: 199900, capacity: 1000, maxPerUser: 4, sortOrder: 2 },
  ]);

  console.log(`Seeded "${event.name}" → /events/${slug}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

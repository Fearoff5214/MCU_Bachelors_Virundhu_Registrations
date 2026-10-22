import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, ticketTiers } from "@/db/schema";
import { Card, PageTitle } from "@/components/ui";
import { EventForm, TierForm } from "../../_components/forms";
import { toISTInput, UUID_RE } from "../../_lib";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();
  const tiers = await db
    .select()
    .from(ticketTiers)
    .where(eq(ticketTiers.eventId, id))
    .orderBy(asc(ticketTiers.sortOrder), asc(ticketTiers.name));

  return (
    <>
      <PageTitle kicker="Edit event">{event.name}</PageTitle>

      <Card className="p-5 sm:p-6">
        <EventForm
          initial={{
            id: event.id,
            name: event.name,
            slug: event.slug,
            tagline: event.tagline ?? "",
            description: event.description,
            venue: event.venue,
            startsAt: toISTInput(event.startsAt),
            bannerUrl: event.bannerUrl ?? "",
            vibeTags: event.vibeTags.join(", "),
            salesOpenAt: toISTInput(event.salesOpenAt),
            salesCloseAt: toISTInput(event.salesCloseAt),
            status: event.status,
          }}
        />
      </Card>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">Ticket tiers</h2>
      <div className="grid gap-4">
        {tiers.map((t) => (
          <Card key={t.id} className="p-5">
            <TierForm
              eventId={event.id}
              initial={{
                id: t.id,
                name: t.name,
                description: t.description ?? "",
                price: String(t.pricePaise / 100),
                capacity: String(t.capacity),
                maxPerUser: String(t.maxPerUser),
                sortOrder: String(t.sortOrder),
                sold: t.sold,
                held: t.held,
              }}
            />
          </Card>
        ))}
        <Card className="border-dashed p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan">Add a tier</p>
          {/* key forces a fresh empty form after each successful add */}
          <TierForm key={tiers.length} eventId={event.id} />
        </Card>
      </div>
    </>
  );
}

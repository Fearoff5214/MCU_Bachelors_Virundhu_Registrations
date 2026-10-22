import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Aurora } from "@/components/aurora";
import { StateBadge } from "@/components/event-card";
import { TierPicker } from "@/components/tier-picker";
import { Card, Chip } from "@/components/ui";
import { auth } from "@/lib/auth";
import { eventDate } from "@/lib/format";
import { getEventBySlug, salesState } from "@/lib/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event ? { title: event.name, description: event.tagline ?? undefined } : {};
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()]);
  if (!event) notFound();
  const state = salesState(event, event.tiers);
  const opensAt = event.salesOpenAt ? new Date(event.salesOpenAt) : null;

  return (
    <div className="relative pt-6">
      <Aurora />
      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
        {event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="aspect-[21/9] w-full object-cover" />
        ) : (
          <div className="aspect-[21/9] w-full bg-gradient-to-br from-magenta/50 via-void to-cyan/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
      </div>

      <div className="relative -mt-16 grid gap-8 md:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {event.vibeTags.map((tag) => (
              <Chip key={tag} color="saffron">
                #{tag}
              </Chip>
            ))}
          </div>
          <h1 className="glitch mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl" data-text={event.name}>
            {event.name}
          </h1>
          {event.tagline && <p className="mt-2 text-lg text-mute">{event.tagline}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-mute">When</p>
              <p className="mt-1 font-semibold text-cyan">{eventDate(new Date(event.startsAt))}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-mute">Where</p>
              <p className="mt-1 font-semibold text-cyan">{event.venue}</p>
            </Card>
          </div>

          <div className="mt-8 whitespace-pre-line leading-relaxed text-ink/85">{event.description}</div>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <Card className="holo-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Tickets</h2>
              <StateBadge state={state} />
            </div>
            {state === "not_open" && opensAt && (
              <p className="mb-4 rounded-xl border border-cyan/30 bg-cyan/10 p-3 text-sm text-cyan">
                Sales open {eventDate(opensAt)}
              </p>
            )}
            <TierPicker slug={event.slug} tiers={event.tiers} state={state} signedIn={!!session} />
          </Card>
        </aside>
      </div>
    </div>
  );
}

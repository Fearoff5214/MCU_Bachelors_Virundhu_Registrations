import Link from "next/link";
import { eventDate, rupees } from "@/lib/format";
import { type PublicTier, salesState } from "@/lib/queries";
import { T } from "./copy";
import { Chip } from "./ui";

type Props = {
  event: {
    slug: string;
    name: string;
    tagline: string | null;
    venue: string;
    startsAt: Date | string;
    bannerUrl: string | null;
    vibeTags: string[];
    status: string;
    salesOpenAt: Date | string | null;
    salesCloseAt: Date | string | null;
    tiers: PublicTier[];
  };
};

export function EventCard({ event }: Props) {
  const state = salesState(event, event.tiers);
  const from = event.tiers.length ? Math.min(...event.tiers.map((t) => t.pricePaise)) : null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group glass relative flex flex-col overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_20px_60px_-20px_var(--color-cyan)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-panel">
        {event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="size-full bg-gradient-to-br from-magenta/40 via-void to-cyan/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {event.vibeTags.slice(0, 3).map((tag) => (
            <Chip key={tag} color="saffron" className="bg-void/70 backdrop-blur">
              #{tag}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan">{eventDate(new Date(event.startsAt))}</p>
        <h3 className="font-display text-xl font-bold leading-tight">{event.name}</h3>
        {event.tagline && <p className="text-sm text-mute">{event.tagline}</p>}
        <p className="text-sm text-mute">📍 {event.venue}</p>

        <div className="mt-auto flex items-center justify-between pt-4">
          {from !== null && (
            <p className="text-sm">
              <span className="text-mute">from </span>
              <span className="font-display text-lg font-bold text-lime">{rupees(from)}</span>
            </p>
          )}
          <StateBadge state={state} />
        </div>
      </div>
    </Link>
  );
}

export function StateBadge({ state }: { state: ReturnType<typeof salesState> }) {
  if (state === "open")
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-lime">
        <span className="size-2 animate-pulse-live rounded-full bg-lime" /> Live
      </span>
    );
  const key = state === "sold_out" ? "soldOut" : state === "not_open" ? "notOpen" : "closed";
  return (
    <span className="text-xs font-semibold text-mute">
      <T k={key} />
    </span>
  );
}

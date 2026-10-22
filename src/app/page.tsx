import { Aurora } from "@/components/aurora";
import { T } from "@/components/copy";
import { EventCard } from "@/components/event-card";
import { ButtonLink } from "@/components/ui";
import { getPublishedEvents } from "@/lib/queries";

export default async function HomePage() {
  const events = await getPublishedEvents();
  const upcoming = events.filter((e) => new Date(e.startsAt).getTime() > Date.now() - 12 * 3600_000);

  return (
    <>
      <section className="relative -mx-4 overflow-hidden px-4 pb-16 pt-16 sm:-mx-6 sm:px-6 sm:pt-24">
        <Aurora />
        <p className="text-xs font-semibold uppercase tracking-[.3em] text-cyan">
          <T k="heroKicker" />
        </p>
        <h1 className="mt-4 font-display text-5xl font-black leading-[.95] tracking-tight sm:text-7xl md:text-8xl">
          Bachelors
          <br />
          <span className="glitch neon-text" data-text="Virundhu">
            Virundhu
          </span>
        </h1>
        <p className="mt-4 font-tamil text-2xl font-extrabold text-saffron sm:text-3xl">பேச்சுலர்ஸ் விருந்து</p>
        <p className="mt-6 max-w-lg text-base text-mute sm:text-lg">
          Music, food, mapla gang. Book in seconds with Google. Your QR ticket lands on your phone and in your inbox.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="#events">
            <T k="heroCta" /> →
          </ButtonLink>
          <ButtonLink href="/tickets" variant="ghost">
            <T k="myTickets" />
          </ButtonLink>
        </div>
      </section>

      <section id="events" className="scroll-mt-20">
        <h2 className="mb-6 font-display text-2xl font-bold">
          <T k="upcoming" />
        </h2>
        {upcoming.length === 0 ? (
          <p className="glass rounded-2xl p-8 text-center text-mute">
            <T k="noEvents" />
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

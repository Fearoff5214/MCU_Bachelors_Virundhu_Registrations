import clsx from "clsx";
import Link from "next/link";
import { eventDate, timeIST } from "@/lib/format";
import type { TicketView } from "@/lib/my-tickets";
import { T } from "./copy";
import { Chip } from "./ui";

/** Holographic boarding-pass style ticket. */
export function TicketCard({ ticket, large = false }: { ticket: TicketView; large?: boolean }) {
  const startsAt = new Date(ticket.startsAt);
  const isToday = new Date().toDateString() === startsAt.toDateString();
  const inactive = ticket.status !== "valid";

  return (
    <article
      className={clsx(
        "holo-border relative overflow-hidden rounded-3xl bg-gradient-to-b from-panel to-night",
        !inactive && "transition duration-300 hover:-translate-y-1 hover:rotate-[-.5deg] hover:shadow-[0_30px_80px_-30px_var(--color-magenta)]",
      )}
    >
      <div className="h-1.5 bg-gradient-to-r from-cyan via-magenta to-saffron" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-mute">Bachelors Virundhu</p>
            <h3 className="mt-1 truncate font-display text-xl font-bold">{ticket.eventName}</h3>
          </div>
          {isToday && ticket.status === "valid" ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="size-1.5 animate-pulse-live rounded-full bg-white" /> Live
            </span>
          ) : (
            <Chip color="magenta" className="shrink-0">
              {ticket.tierName}
            </Chip>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-mute">When</dt>
            <dd className="font-semibold text-cyan">{eventDate(startsAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-mute">Holder</dt>
            <dd className="truncate font-semibold">{ticket.holder ?? "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wider text-mute">Venue</dt>
            <dd className="font-semibold">{ticket.venue}</dd>
          </div>
        </dl>
      </div>

      {/* Perforated tear line with notches */}
      <div className="relative h-5">
        <div className="perforation absolute inset-x-6 top-1/2 h-3.5 -translate-y-1/2 opacity-60" />
        <div className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-void" />
        <div className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-void" />
      </div>

      <div className="flex flex-col items-center p-5 pt-2">
        <div className={clsx("relative rounded-2xl bg-white p-3", large ? "w-full max-w-xs" : "w-48")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ticket.qr} alt={`QR code for ticket ${ticket.code}`} className={clsx("w-full", inactive && "opacity-15")} />
          {inactive && (
            <div className="absolute inset-0 grid place-items-center">
              <span
                className={clsx(
                  "-rotate-12 rounded-lg border-2 px-3 py-1 font-display text-lg font-black uppercase",
                  ticket.status === "used" ? "border-lime/80 bg-void/80 text-lime" : "border-danger bg-void/80 text-danger",
                )}
              >
                <T k={ticket.status === "used" ? "used" : "cancelled"} />
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 font-mono text-lg font-bold tracking-[.2em]">{ticket.code}</p>
        {ticket.status === "used" && ticket.checkedInAt && (
          <p className="text-xs text-mute">at {timeIST(new Date(ticket.checkedInAt))}</p>
        )}

        {!large && (
          <div className="mt-4 flex w-full gap-2">
            <Link
              href={`/tickets/${ticket.id}`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-lime text-sm font-bold text-void"
            >
              Full screen
            </Link>
            <a
              href={`/api/tickets/${ticket.orderId}/pdf?ticket=${ticket.id}`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm hover:border-cyan hover:text-cyan"
            >
              <T k="downloadPdf" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

import { redirect } from "next/navigation";
import { Celebrate } from "@/components/celebrate";
import { T } from "@/components/copy";
import { TicketCard } from "@/components/ticket-card";
import { ButtonLink, PageTitle } from "@/components/ui";
import { auth } from "@/lib/auth";
import { ticketsForUser } from "@/lib/my-tickets";

export const metadata = { title: "My Tickets" };

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/tickets");
  const { new: newOrder } = await searchParams;
  const tickets = await ticketsForUser(session.user.id);
  const justBought = newOrder && tickets.some((t) => t.orderId === newOrder);

  return (
    <div>
      <PageTitle kicker={session.user.email}>
        <T k="myTickets" />
      </PageTitle>
      {justBought && <Celebrate />}
      {tickets.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-mute">
            <T k="noTickets" />
          </p>
          <ButtonLink href="/#events" className="mt-6">
            <T k="heroCta" />
          </ButtonLink>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}

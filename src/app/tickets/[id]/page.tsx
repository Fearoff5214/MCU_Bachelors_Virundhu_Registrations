import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { T } from "@/components/copy";
import { TicketCard } from "@/components/ticket-card";
import { WakeLock } from "@/components/wake-lock";
import { auth } from "@/lib/auth";
import { ticketForUser } from "@/lib/my-tickets";

export const metadata = { title: "Your ticket" };

export default async function TicketFullScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/signin?callbackUrl=/tickets/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ticket = await ticketForUser(session.user.id, id);
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-sm pt-6">
      <WakeLock />
      <Link href="/tickets" className="text-sm text-mute hover:text-ink">
        ← <T k="myTickets" />
      </Link>
      <p className="mt-4 text-center font-display text-lg font-bold text-lime">
        <T k="showAtGate" />
      </p>
      <p className="mb-4 text-center text-xs text-mute">
        <T k="brightness" /> ☀️
      </p>
      <TicketCard ticket={ticket} large />
    </div>
  );
}

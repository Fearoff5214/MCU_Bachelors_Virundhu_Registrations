import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadOrderBundle, toPdfInput } from "@/lib/pdf/load-order";
import { renderTicketsPdf } from "@/lib/pdf/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// [id] is the ORDER id. ?ticket=<ticketId> narrows the PDF to one ticket of that order.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  const ticketId = new URL(req.url).searchParams.get("ticket") ?? undefined;
  if (!UUID.test(id) || (ticketId && !UUID.test(ticketId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bundle = await loadOrderBundle(id, { ticketId });
  // Same 404 for "not yours" and "doesn't exist", so order ids can't be probed.
  if (!bundle || (bundle.order.userId !== session.user.id && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (bundle.order.status !== "paid" || bundle.tickets.length === 0) {
    return NextResponse.json({ error: "No tickets for this order" }, { status: 404 });
  }

  const pdf = await renderTicketsPdf(toPdfInput(bundle));
  const name = ticketId && bundle.tickets[0] ? bundle.tickets[0].code : `BV-tickets-${id.slice(0, 8)}`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

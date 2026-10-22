import { eventDate } from "@/lib/format";
import { qrPngBuffer } from "@/lib/qr";
import { renderTicketsPdf } from "@/lib/pdf/ticket";
import { toPdfInput, type OrderBundle } from "@/lib/pdf/load-order";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  /** Set for inline images referenced as <img src="cid:..."> */
  contentId?: string;
};

export type TicketEmail = {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Builds the "Seat confirm aachu!" email. QR images are attached inline (CID) because Gmail
 * strips data: URIs; the full tickets PDF is attached as well.
 */
export async function buildTicketEmail(bundle: OrderBundle): Promise<TicketEmail> {
  const { event, tickets } = bundle;
  const ticketsUrl = `${appUrl()}/tickets`;
  const when = eventDate(event.startsAt);
  const firstName = (bundle.buyer.name ?? "").split(" ")[0] || "mapla";

  const qrAttachments: EmailAttachment[] = await Promise.all(
    tickets.map(async (t) => ({
      filename: `${t.code}.png`,
      content: await qrPngBuffer(t.qrToken, 480),
      contentType: "image/png",
      contentId: `qr-${t.code.toLowerCase()}`,
    })),
  );

  const pdf = await renderTicketsPdf(toPdfInput(bundle));

  const ticketBlocks = tickets
    .map(
      (t, i) => `
      <tr><td style="padding:0 0 16px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141423;border:1px solid #2a2a3d;border-radius:14px;">
          <tr><td style="padding:18px 20px 6px 20px;font-family:Arial,Helvetica,sans-serif;">
            <span style="font-size:11px;letter-spacing:2px;color:#ff9f1c;font-weight:bold;">TICKET ${i + 1} OF ${tickets.length}</span>
            <span style="display:inline-block;margin-left:8px;padding:2px 8px;border:1px solid #ff2e88;border-radius:10px;color:#ff2e88;font-size:11px;font-weight:bold;letter-spacing:1px;">${esc(t.tierName.toUpperCase())}</span>
          </td></tr>
          <tr><td align="center" style="padding:10px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;"><tr><td style="padding:12px;">
              <img src="cid:qr-${t.code.toLowerCase()}" width="220" height="220" alt="QR for ${esc(t.code)}" style="display:block;width:220px;height:220px;border:0;" />
            </td></tr></table>
          </td></tr>
          <tr><td align="center" style="padding:4px 20px 18px 20px;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;letter-spacing:3px;color:#f4f4fb;">${esc(t.code)}</td></tr>
        </table>
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Your tickets</title></head>
<body style="margin:0;padding:0;background:#07070c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07070c;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="height:5px;background:#ff2e88;background-image:linear-gradient(90deg,#00e5ff,#ff2e88,#ff9f1c);border-radius:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:24px 4px 6px 4px;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:12px;letter-spacing:3px;color:#00e5ff;font-weight:bold;">BACHELORS VIRUNDHU</div>
        <h1 style="margin:14px 0 6px 0;font-size:28px;line-height:1.2;color:#c6ff00;">Seat confirm aachu! 🎉</h1>
        <p style="margin:0;font-size:15px;line-height:1.5;color:#f4f4fb;">Vanakkam ${esc(firstName)}, you're in. Gate-la indha QR-a kaatunga — each code works once.</p>
      </td></tr>
      <tr><td style="padding:18px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a3d;border-radius:14px;">
          <tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;color:#f4f4fb;">
            <div style="font-size:20px;font-weight:bold;">${esc(event.name)}</div>
            <div style="margin-top:10px;font-size:11px;letter-spacing:1.5px;color:#9a9ab5;">WHEN (IST)</div>
            <div style="font-size:15px;">${esc(when)}</div>
            <div style="margin-top:10px;font-size:11px;letter-spacing:1.5px;color:#9a9ab5;">WHERE</div>
            <div style="font-size:15px;">${esc(event.venue)}</div>
          </td></tr>
        </table>
      </td></tr>
      ${ticketBlocks}
      <tr><td align="center" style="padding:8px 0 24px 0;">
        <a href="${ticketsUrl}" style="display:inline-block;background:#c6ff00;color:#07070c;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:12px;">View My Tickets</a>
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9a9ab5;padding:0 4px 24px 4px;">
        Tip: screen brightness full-a vechukonga at the gate. A PDF copy is attached, and your tickets are always under My Tickets when you sign in with this Google account. Don't share your QR — the first scan wins.
      </td></tr>
      <tr><td style="height:3px;background:#00e5ff;background-image:linear-gradient(90deg,#00e5ff,#ff2e88,#ff9f1c);border-radius:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#5d5d78;padding:12px 4px;">Made in Kovai ☕ · Bachelors Virundhu · MCU</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `Seat confirm aachu! 🎉`,
    ``,
    `Vanakkam ${firstName}, you're in.`,
    ``,
    `${event.name}`,
    `When (IST): ${when}`,
    `Where: ${event.venue}`,
    ``,
    ...tickets.map((t, i) => `Ticket ${i + 1}: ${t.code} (${t.tierName})`),
    ``,
    `Your QR codes are attached (PDF) and always available at ${ticketsUrl}`,
    `Show the QR at the gate. Each code works once.`,
  ].join("\n");

  return {
    subject: `🎟️ Your ${tickets.length > 1 ? `${tickets.length} tickets` : "ticket"} for ${event.name}`,
    html,
    text,
    attachments: [
      ...qrAttachments,
      { filename: `BV-tickets-${bundle.order.id.slice(0, 8)}.pdf`, content: pdf, contentType: "application/pdf" },
    ],
  };
}

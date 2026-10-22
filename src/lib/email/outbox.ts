import { eq, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { loadOrderBundle } from "@/lib/pdf/load-order";
import { buildTicketEmail } from "./ticket-email";

const MAX_ATTEMPTS = 6;
// Minutes to wait after the 1st, 2nd, 3rd, 4th+ failure.
const BACKOFF_MINUTES = [1, 5, 15, 60];

export type OutboxResult = { claimed: number; sent: number; retrying: number; failed: number };

let resendClient: Resend | null = null;
function resend() {
  if (!process.env.RESEND_API_KEY) return null;
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

type ClaimedRow = { id: string; order_id: string; to: string; attempts: number };

/**
 * Sends due ticket emails. Rows are claimed with FOR UPDATE SKIP LOCKED, so overlapping cron runs
 * (or a call right after payment) never send the same email twice. Claiming pushes next_attempt_at
 * 5 minutes out, so a run that crashes mid-way is retried automatically.
 */
export async function processOutbox(limit = 50): Promise<OutboxResult> {
  const claimed = await db.execute<ClaimedRow>(sql`
    UPDATE email_outbox SET next_attempt_at = now() + interval '5 minutes'
    WHERE id IN (
      SELECT id FROM email_outbox
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING id, order_id, "to", attempts
  `);

  const result: OutboxResult = { claimed: claimed.length, sent: 0, retrying: 0, failed: 0 };

  for (const row of claimed) {
    try {
      await sendOne(row);
      await db.update(emailOutbox).set({ status: "sent", sentAt: new Date(), lastError: null }).where(eq(emailOutbox.id, row.id));
      result.sent++;
    } catch (err) {
      const attempts = row.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);
      const giveUp = attempts >= MAX_ATTEMPTS;
      const wait = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
      await db
        .update(emailOutbox)
        .set({
          attempts,
          lastError: message.slice(0, 1000),
          status: giveUp ? "failed" : "pending",
          nextAttemptAt: new Date(Date.now() + wait * 60_000),
        })
        .where(eq(emailOutbox.id, row.id));
      console.error(`[outbox] ${row.id} attempt ${attempts} failed: ${message}`);
      if (giveUp) result.failed++;
      else result.retrying++;
    }
  }

  return result;
}

async function sendOne(row: ClaimedRow) {
  const bundle = await loadOrderBundle(row.order_id);
  if (!bundle) throw new Error(`Order ${row.order_id} not found`);
  if (bundle.tickets.length === 0) throw new Error(`Order ${row.order_id} has no valid tickets`);

  const email = await buildTicketEmail(bundle);
  const client = resend();

  if (!client) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.log(
      `[outbox:dev] RESEND_API_KEY missing — would send to ${row.to}\n  subject: ${email.subject}\n  attachments: ${email.attachments
        .map((a) => a.filename)
        .join(", ")}\n${email.text}`,
    );
    return;
  }

  const { error } = await client.emails.send(
    {
      from: process.env.EMAIL_FROM ?? "Bachelors Virundhu <onboarding@resend.dev>",
      to: row.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        contentId: a.contentId,
      })),
    },
    // Resend dedupes on this key for 24h, so a retry after a timeout can't double-send.
    { idempotencyKey: `outbox-${row.id}` },
  );
  if (error) throw new Error(`${error.name}: ${error.message}`);
}

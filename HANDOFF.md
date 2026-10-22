# BV Registration Portal: Handoff

Ticketing portal for Bachelors Virundhu events. One Next.js 15 app (App Router) holds the UI and the backend. There is no separate server.

## Stack

| Concern | Tech | Where |
|---|---|---|
| App / API | Next.js 15, React 19, Tailwind 4 | `src/app` |
| Database | Postgres (Supabase) via Drizzle ORM | `src/db/schema.ts`, `drizzle/` |
| Auth | Auth.js v5, Google sign-in | `src/lib/auth.ts` |
| Seat inventory / holds | transactional reserve + confirm + expire | `src/lib/inventory.ts` |
| Checkout | server actions | `src/app/checkout/actions.ts` |
| Tickets | signed QR tokens, PDF | `src/lib/qr.ts`, `src/lib/pdf/ticket.tsx` |
| Entry scanning | staff scanner page + API | `src/app/scan`, `src/app/api/scan`, `src/lib/checkin.ts` |
| Email | Resend, via an outbox table | `src/lib/email/` |
| Background jobs | Vercel Cron (every minute) | `vercel.json`, `src/app/api/cron/*` |
| Payments | pluggable provider interface | `src/lib/payments/` |

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run db:migrate           # applies drizzle/*.sql to DATABASE_URL_DIRECT
npm run db:seed              # sample data
npm run dev                  # http://localhost:3000
npm test
```

## Environment variables

See `.env.example`. Never commit real values. `.env` and `.env.local` are gitignored.

| Var | Notes |
|---|---|
| `DATABASE_URL` | Supabase **pooled** string (port 6543). Used by the running app. |
| `DATABASE_URL_DIRECT` | Supabase **direct** string (port 5432). Used only by `drizzle-kit`. |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud OAuth client |
| `ADMIN_EMAILS` | Comma-separated Google emails that become admin on first sign-in |
| `QR_SECRET` | 32 random bytes in hex. **Changing it invalidates every issued QR.** |
| `PAYMENT_PROVIDER` | `mock` until the real gateway is added |
| `RESEND_API_KEY` / `EMAIL_FROM` | `EMAIL_FROM` must use a domain verified in Resend |
| `APP_URL` | Public URL, e.g. `https://tickets.<yourdomain>`. Used in emails. |
| `CRON_SECRET` | Vercel sends it as a Bearer token to `/api/cron/*` |
| `ALLOW_MOCK_PAYMENTS` | Optional. `true` allows the fake "Pay (test)" button in production. **Staging only.** |

## Deploying to the subdomain (Vercel)

1. Push the repo to GitHub and import it in Vercel. Framework preset is Next.js.
2. Add all env vars above in Vercel (Production). Set `APP_URL` to the final subdomain URL.
3. In Vercel > Domains, add e.g. `tickets.<yourdomain>`. Then at the DNS provider, add the **CNAME** that Vercel shows for the subdomain.
4. Google Cloud Console > OAuth client: add `https://tickets.<yourdomain>/api/auth/callback/google` as an authorized redirect URI, and the domain as an authorized JS origin.
5. Resend: verify the sending domain (add the DNS records it gives you) so `EMAIL_FROM` works.
6. Run migrations against the production DB once: `npm run db:migrate` with `DATABASE_URL_DIRECT` pointing at it.
7. Cron jobs come from `vercel.json` and run every minute. **Vercel Hobby only allows daily crons**, so this needs the Pro plan. Alternatively, trigger the two routes from an external scheduler with `Authorization: Bearer $CRON_SECRET`.
   - `/api/cron/expire-holds` releases unpaid seat holds.
   - `/api/cron/send-emails` drains the email outbox.

## Payments: the open item

The gateway is **not chosen yet**. Today only the `mock` provider exists.

- In production, `mock` is **disabled** (`mockPaymentsAllowed()` in `src/lib/payments/mock.ts`). With no real gateway, a public deploy shows events but **cannot sell tickets**. This is deliberate.
- Do not set `ALLOW_MOCK_PAYMENTS=true` on the public site. Anyone could then get free tickets.

To add a gateway, implement the `PaymentProvider` interface (`src/lib/payments/types.ts`):

1. `createOrder`: create the order at the gateway. Return `providerOrderId` and a `clientPayload` for the checkout UI.
2. `verifyWebhook`: **verify the gateway signature** on the raw request body. Return `{ providerOrderId, status: "paid" | "failed" }`, or `null` for bad signatures and irrelevant events.
3. Register it in `src/lib/payments/index.ts` and set `PAYMENT_PROVIDER` to its name.
4. Point the gateway's webhook at `https://tickets.<yourdomain>/api/payments/webhook/<providerName>`.
5. Update `src/app/checkout/[orderId]/page.tsx` to launch the gateway's checkout using `clientPayload` (it currently only renders the mock button).
6. Optional: implement `refund`.

Money is only treated as received when the verified webhook calls `confirmPayment`. Never trust a browser redirect as proof of payment.

## Before going public

- [ ] Gateway implemented and tested end to end in the gateway's test mode, including webhook delivery to the real subdomain
- [ ] `PAYMENT_PROVIDER` is the real provider and `ALLOW_MOCK_PAYMENTS` is unset in production
- [ ] Run `npm run loadtest:oversell` against a staging DB to confirm sold seats never exceed capacity
- [ ] Sign in with an `ADMIN_EMAILS` account, create an event, buy a ticket, receive the email, scan the QR at `/scan`
- [ ] Production secrets differ from dev, and no secret was ever committed to git
- [ ] Supabase backups/PITR are on

## Notes for AI-assisted changes (Antigravity etc.)

- Keep stock and payment-state changes inside the transactional functions in `src/lib/inventory.ts`. Don't update seat counts or order status from elsewhere.
- Schema change: edit `src/db/schema.ts`, run `npm run db:generate`, review the SQL, commit `drizzle/`, then `npm run db:migrate`. Never hand-edit applied migration files.
- Run `npm test` and `npx tsc --noEmit` before deploying.

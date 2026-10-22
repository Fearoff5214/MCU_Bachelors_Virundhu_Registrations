/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Open only in local dev when no secret is set. */
export function isAuthorizedCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

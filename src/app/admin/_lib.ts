const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "2026-12-24T19:30" typed in a datetime-local input, read as IST. */
export function parseIST(value: string | undefined | null): Date | null {
  if (!value) return null;
  const v = value.length === 16 ? `${value}:00` : value;
  const d = new Date(`${v}+05:30`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

/** Date -> value for a datetime-local input, shown in IST. */
export function toISTInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

export function istDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

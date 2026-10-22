import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { checkIn } from "@/lib/checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    eventId: z.uuid(),
    token: z.string().max(200).optional(),
    code: z.string().max(40).optional(),
  })
  .refine((b) => b.token || b.code, "token or code required");

export async function POST(req: Request) {
  const session = await requireRole("staff", "admin");
  if (!session) return Response.json({ error: "Staff only" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });

  const result = await checkIn({ ...parsed.data, staffId: session.user.id });
  return Response.json(result);
}

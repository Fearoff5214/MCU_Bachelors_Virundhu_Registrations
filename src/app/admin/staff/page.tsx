import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Card, Chip, PageTitle } from "@/components/ui";
import { DemoteButton, PromoteForm } from "../_components/forms";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await auth();
  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role })
    .from(users)
    .where(inArray(users.role, ["staff", "admin"]))
    .orderBy(asc(users.role), asc(users.email));

  return (
    <>
      <PageTitle kicker="Access">Staff &amp; admins</PageTitle>

      <Card className="mb-6 p-5">
        <PromoteForm />
        <p className="mt-3 text-xs text-mute">
          The person must have signed in with Google at least once. Staff can open <b>/scan</b> to check tickets at the gate;
          admins can also manage events and orders.
        </p>
      </Card>

      <Card className="overflow-x-auto p-2 sm:p-4">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-mute">
            <tr className="border-b border-line">
              <th className="px-2 py-2 font-semibold">Person</th>
              <th className="px-2 py-2 font-semibold">Role</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-b border-line/50">
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="size-7 rounded-full bg-panel" />
                    )}
                    <div>
                      <p>{u.name ?? "—"}</p>
                      <p className="text-xs text-mute">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <Chip color={u.role === "admin" ? "magenta" : "lime"}>{u.role}</Chip>
                </td>
                <td className="px-2 py-2.5 text-right">
                  {u.email && <DemoteButton email={u.email} disabled={u.id === session?.user.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

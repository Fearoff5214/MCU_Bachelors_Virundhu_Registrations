import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const metadata = { title: "Admin" };

const links = [
  { href: "/admin", label: "Events" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/staff", label: "Staff" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "admin") notFound();

  return (
    <div className="pt-6">
      <nav className="flex gap-1 overflow-x-auto border-b border-line pb-px text-sm">
        <span className="mr-2 self-center text-[11px] font-bold uppercase tracking-[.25em] text-magenta">Admin</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-t-lg px-3 py-2 text-mute transition hover:bg-panel hover:text-ink"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/scan");
  if (session.user.role !== "staff" && session.user.role !== "admin") notFound();
  return <>{children}</>;
}

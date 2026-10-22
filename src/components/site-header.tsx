import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { LangToggle, T } from "./copy";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user.role;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-cyan via-magenta to-saffron text-sm font-black text-void">
            BV
          </span>
          <span className="hidden sm:inline">
            Bachelors <span className="neon-text">Virundhu</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-3">
          {session && (
            <Link href="/tickets" className="rounded-lg px-2 py-2 text-mute hover:text-ink">
              <T k="myTickets" />
            </Link>
          )}
          {(role === "staff" || role === "admin") && (
            <Link href="/scan" className="rounded-lg px-2 py-2 text-lime hover:brightness-125">
              Scan
            </Link>
          )}
          {role === "admin" && (
            <Link href="/admin" className="rounded-lg px-2 py-2 text-magenta hover:brightness-125">
              Admin
            </Link>
          )}
          <LangToggle />
          {session ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                className="flex items-center gap-2 rounded-full border border-line p-0.5 text-xs text-mute hover:text-ink sm:pr-3"
                title="Sign out"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="size-7 rounded-full bg-panel" />
                )}
                <span className="hidden sm:inline">
                  <T k="signOut" />
                </span>
              </button>
            </form>
          ) : (
            <Link href="/signin" className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-void hover:bg-cyan">
              <T k="signIn" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { T } from "@/components/copy";
import { Card } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  // Only allow same-site redirects after login.
  const next = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  if (await auth()) redirect(next);

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <Card className="holo-border w-full max-w-sm p-8 text-center">
        <p className="font-tamil text-4xl font-extrabold neon-text">வாங்க</p>
        <h1 className="mt-3 font-display text-2xl font-bold">
          <T k="welcome" />
        </h1>
        <p className="mt-2 text-sm text-mute">Your tickets stay linked to your Google account.</p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: next });
          }}
        >
          <button className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white font-semibold text-void transition hover:brightness-95 active:scale-[.98]">
            <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
        </form>
      </Card>
    </div>
  );
}

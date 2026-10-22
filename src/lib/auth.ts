import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export type Role = "buyer" | "staff" | "admin";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // DB sessions: role changes (e.g. promoting a volunteer to staff) apply on the next request.
  session: { strategy: "database" },
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as unknown as { role: Role }).role ?? "buyer";
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id!));
      }
    },
  },
});

export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user || !roles.includes(session.user.role)) return null;
  return session;
}

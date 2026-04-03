import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import authConfig from "@/auth.config";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);
        if (!parsed.success) {
          devLog("auth", "authorize: invalid credentials shape");
          return null;
        }

        devLog("auth", "authorize: attempt", { email: parsed.data.email });

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
          columns: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            profileImageUrl: true,
          },
        });
        if (
          !user ||
          !(await compare(parsed.data.password, user.passwordHash))
        ) {
          devLog("auth", "authorize: failed (no user or bad password)", {
            email: parsed.data.email,
          });
          return null;
        }

        devLog("auth", "authorize: ok", { userId: user.id });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImageUrl: user.profileImageUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.profileImageUrl =
          (user as { profileImageUrl?: string | null }).profileImageUrl ??
          null;
      }
      if (trigger === "update" && session) {
        devLog("auth", "jwt: session update trigger", {
          hasName: (session as { name?: string }).name !== undefined,
          hasProfileImageUrl:
            (session as { profileImageUrl?: string | null }).profileImageUrl !==
            undefined,
        });
        const s = session as {
          name?: string;
          profileImageUrl?: string | null;
        };
        if (s.name !== undefined) token.name = s.name;
        if (s.profileImageUrl !== undefined) token.profileImageUrl = s.profileImageUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        session.user.profileImageUrl =
          (token.profileImageUrl as string | null | undefined) ?? null;
      }
      if (!session.user?.id) return session;

      const row = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { name: true, email: true, profileImageUrl: true },
      });
      if (row) {
        session.user.name = row.name;
        session.user.email = row.email;
        session.user.profileImageUrl = row.profileImageUrl;
      }
      return session;
    },
  },
});

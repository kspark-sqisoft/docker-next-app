import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge 미들웨어에서만 사용합니다. DB(Prisma)를 import 하지 않습니다.
 * 실제 authorize 는 auth.ts 에서 덮어씁니다.
 */
export default {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.profileImageUrl =
          (user as { profileImageUrl?: string | null }).profileImageUrl ??
          null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        (session.user as { profileImageUrl?: string | null }).profileImageUrl =
          (token.profileImageUrl as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

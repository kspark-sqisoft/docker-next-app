import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { devLog } from "@/lib/dev-log";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;

  devLog("middleware", "protected route check", {
    pathname,
    isAuthed,
  });

  if (pathname === "/posts/new" || pathname === "/profile") {
    if (!isAuthed) {
      devLog("middleware", "redirect → /login (unauthenticated)", {
        pathname,
        callbackUrl: pathname,
      });
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return Response.redirect(url);
    }
  }

  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) {
    if (!isAuthed) {
      devLog("middleware", "redirect → /login (unauthenticated)", {
        pathname,
        callbackUrl: pathname,
      });
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return Response.redirect(url);
    }
  }

  devLog("middleware", "allow", { pathname });
  return undefined;
});

export const config = {
  matcher: ["/posts/new", "/posts/:id/edit", "/profile"],
};

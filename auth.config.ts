import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no database or bcrypt imports here, because middleware.ts uses it.
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [], // real providers are added in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      const loggedIn = !!auth?.user;
      const isPublic =
        path === "/" || path === "/login" || path === "/register";

      if (isPublic) {
        if (loggedIn && path !== "/") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      return loggedIn; // false sends the visitor to /login
    },
  },
} satisfies NextAuthConfig;

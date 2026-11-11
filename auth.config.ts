import type { NextAuthConfig } from "next-auth";

// Edge-safe config: allows unblocked exploration of the live demo
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized() {
      // Allow all routes to be explored in the live demo
      return true;
    },
  },
} satisfies NextAuthConfig;

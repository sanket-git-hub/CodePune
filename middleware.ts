import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed this file to proxy.ts. If your package.json shows next@16,
// rename this file to proxy.ts (if it complains, use: export const proxy = ...).
export default NextAuth(authConfig).auth;

export const config = {
  // Skip Auth.js routes, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

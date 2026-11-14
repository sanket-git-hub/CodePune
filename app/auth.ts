// Auth configuration with explicit Google OAuth redirect URI

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";
import type { Role } from "@/types/next-auth";

// Validate credentials schema
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

// Dummy hash to keep timing consistent when user does not exist
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Explicit Google provider configuration – NextAuth builds the callback URL from NEXTAUTH_URL.
// We add the `redirect_uri` param to guarantee it matches the URL registered in Google Cloud Console.
const googleProvider = Google({
  clientId: process.env.AUTH_GOOGLE_ID ?? "",
  clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
  authorization: {
    params: {
      // The callback URL that Google will redirect to after auth.
      // NEXTAUTH_URL is automatically set by Vercel or can be provided locally.
      redirect_uri: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/callback/google`,
    },
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    // Google OAuth – uses the explicit redirect_uri above.
    googleProvider,
    // Credentials fallback (email/password)
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const { rows } = await pool.query(
          "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
          [email],
        );
        const user = rows[0];
        const ok = await bcrypt.compare(
          password,
          user?.password_hash ?? DUMMY_HASH,
        );
        if (!user || !user.password_hash || !ok) return null;
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // When a Google account signs in, ensure a user exists in our DB.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || !profile.email_verified) return false;
      await pool.query(
        `INSERT INTO users (name, email, role)
         VALUES ($1, $2, 'incoming')
         ON CONFLICT (email) DO NOTHING`,
        [profile.name ?? profile.email, profile.email.toLowerCase()],
      );
      return true;
    },
    // Populate JWT with our internal user ID and role.
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const { rows } = await pool.query(
          "SELECT id, role FROM users WHERE email = $1",
          [token.email.toLowerCase()],
        );
        if (rows[0]) {
          token.id = String(rows[0].id);
          token.role = rows[0].role as Role;
        }
      } else if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Add custom fields to the session object.
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

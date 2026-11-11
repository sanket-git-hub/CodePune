import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";
import type { Role } from "@/types/next-auth";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

// Used so a missing user takes about as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
    Google,
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

    // New Google users are created here with the lowest-privilege signed-in role.
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

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

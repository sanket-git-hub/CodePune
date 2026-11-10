Claude



































Actions · TS
"use server";
 
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { pool } from "@/lib/db";
import { signIn } from "@/auth";
 
const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  // bcrypt only uses the first 72 bytes, so cap the length.
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters"),
});
 
export async function registerAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
 
  const { name, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
 
  // Role is fixed here. Nothing from the form can set it, so nobody can self-register as admin.
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'incoming')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [name, email, hash]
  );
  if (result.rowCount === 0) {
    return { error: "Could not create that account. Try signing in instead." };
  }
 
  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Account created. Please sign in." };
    throw e;
  }
  return {};
}
 

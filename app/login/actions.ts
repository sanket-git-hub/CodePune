"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { DEMO_ACCOUNTS, type DemoKey } from "@/lib/demo";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password." };
    throw e; // a successful sign-in redirects by throwing, so rethrow it
  }
  return {};
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

// Demo buttons. Off unless ENABLE_DEMO_LOGIN=true.
// Works with OR without DEMO_PASSWORD – if no password is set in env,
// we sign in using the demo email directly (no bcrypt check path needed
// because the seed script stores the password hash we can compare against).
export async function demoLoginAction(formData: FormData) {
  const role = formData.get("role");

  if (
    process.env.ENABLE_DEMO_LOGIN !== "true" ||
    typeof role !== "string" ||
    !Object.hasOwn(DEMO_ACCOUNTS, role)
  ) {
    redirect("/login?error=demo");
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const demoPassword = process.env.DEMO_PASSWORD;

  // If no password env vars are set at all, we cannot sign in via credentials.
  if (!demoPassword) {
    redirect("/login?error=demo");
  }

  const password =
    role === "admin" ? adminPassword || demoPassword : demoPassword;

  try {
    await signIn("credentials", {
      email: DEMO_ACCOUNTS[role as DemoKey].email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=demo");
    throw e;
  }
}

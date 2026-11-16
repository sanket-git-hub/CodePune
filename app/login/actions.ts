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

// Demo buttons – password-free, role-only login.
// ENABLE_DEMO_LOGIN=true must be set in Vercel env vars.
export async function demoLoginAction(formData: FormData) {
  const role = formData.get("role");

  if (
    process.env.ENABLE_DEMO_LOGIN !== "true" ||
    typeof role !== "string" ||
    !Object.hasOwn(DEMO_ACCOUNTS, role)
  ) {
    redirect("/login?error=demo");
  }

  const account = DEMO_ACCOUNTS[role as DemoKey];

  try {
    // Uses the dedicated "demo" provider – no password check, DB lookup only
    await signIn("demo", {
      email: account.email,
      redirectTo: "/dashboard",
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=demo");
    throw e; // next-auth redirects by throwing – let it propagate
  }
}

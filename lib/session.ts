import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  isDemo?: boolean;
};

export const DEMO_USER: SessionUser = {
  id: "demo-priya",
  name: "Priya Sharma (Demo)",
  email: "priya@demo.byebyebrain.test",
  role: "incoming",
  isDemo: true,
};

export function isUserDemo(user: { email?: string | null; id?: string | null }): boolean {
  if (!user) return false;
  if (user.id === "demo-priya" || user.id?.startsWith("demo-")) return true;
  if (user.email && user.email.toLowerCase().endsWith("@demo.byebyebrain.test")) return true;
  return false;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth().catch(() => null);
  if (session?.user?.email) {
    const isDemo = isUserDemo(session.user);
    return {
      id: String(session.user.id || ""),
      name: session.user.name,
      email: session.user.email,
      role: session.user.role || "incoming",
      isDemo,
    };
  }

  // If user is not logged in at all, redirect to login page instead of leaking demo data
  redirect("/login");
}

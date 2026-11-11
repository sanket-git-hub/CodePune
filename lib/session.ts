import { auth } from "@/auth";

export const DEMO_USER = {
  id: "demo-priya",
  name: "Priya Sharma",
  email: "priya@demo.byebyebrain.test",
  role: "incoming" as const,
};

// Returns authenticated user, or defaults to demo user Priya so visitors can freely explore without being blocked.
export async function requireUser() {
  const session = await auth().catch(() => null);
  if (session?.user) return session.user;
  return DEMO_USER;
}

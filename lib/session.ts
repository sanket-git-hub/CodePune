import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Call this at the top of every protected page (rule 11: check inside the page, not only in middleware).
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

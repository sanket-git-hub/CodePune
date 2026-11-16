import Link from "next/link";
import { LoginForm } from "./login-form";
import { demoLoginAction, googleAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const demoEnabled = process.env.ENABLE_DEMO_LOGIN === "true";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B14] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F4F4FA]">Sign in</h1>
          <p className="mt-1 text-sm text-[#A5A5C0]">
            ByeByeBrain handover workspace
          </p>
        </div>

        {error === "demo" && (
          <p role="alert" className="text-sm text-[#F43F5E]">
            Demo sign-in is unavailable right now.
          </p>
        )}

        <LoginForm />

        <form action={googleAction}>
          <button
            type="submit"
            className="h-11 w-full rounded-lg border border-white/10 text-sm text-[#F4F4FA] hover:bg-white/5"
          >
            Continue with Google
          </button>
        </form>

        {/* Demo role buttons – always rendered; server action checks ENABLE_DEMO_LOGIN */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-[#A5A5C0]">
            ✨ Try the demo — pick a role, no sign‑up needed
          </p>
          <div className="grid grid-cols-5 gap-2">
            {(["admin", "reviewer", "leaver", "incoming", "outsider"] as const).map((r) => (
              <form key={r} action={demoLoginAction}>
                <input type="hidden" name="role" value={r} />
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/10 text-xs font-medium capitalize text-[#A5B4FC] transition hover:bg-[#6366F1]/30 hover:border-[#6366F1]/80"
                >
                  {r}
                </button>
              </form>
            ))}
          </div>
          <p className="text-xs text-[#A5A5C0]">
            Admin · Reviewer · Leaver · Incoming · Outsider — instant access to the Campus Pay demo project.
          </p>
        </div>

        <p className="text-sm text-[#A5A5C0]">
          No account?{" "}
          <Link href="/register" className="text-[#8B5CF6] underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

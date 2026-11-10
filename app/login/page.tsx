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

        {demoEnabled && (
          <form action={demoLoginAction} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[#A5A5C0]">
              Try the demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["reviewer", "incoming", "outsider"] as const).map((r) => (
                <button
                  key={r}
                  type="submit"
                  name="role"
                  value={r}
                  className="h-10 rounded-lg border border-white/10 text-xs capitalize text-[#F4F4FA] hover:bg-white/5"
                >
                  {r}
                </button>
              ))}
            </div>
          </form>
        )}

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

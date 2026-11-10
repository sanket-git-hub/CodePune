import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B14] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F4F4FA]">
            Create account
          </h1>
          <p className="mt-1 text-sm text-[#A5A5C0]">
            New accounts start as an incoming team member.
          </p>
        </div>
        <RegisterForm />
        <p className="text-sm text-[#A5A5C0]">
          Already registered?{" "}
          <Link href="/login" className="text-[#8B5CF6] underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

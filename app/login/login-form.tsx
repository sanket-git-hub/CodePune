"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const input =
  "mt-1 h-11 w-full rounded-lg border border-white/10 bg-[#12121F] px-3 text-sm text-[#F4F4FA] outline-none focus:ring-2 focus:ring-[#6366F1]";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    loginAction,
    {} as { error?: string },
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm text-[#A5A5C0]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={input}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm text-[#A5A5C0]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-[#F43F5E]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

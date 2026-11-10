"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";

const input =
  "h-11 w-full rounded-lg border border-white/10 bg-[#12121F] px-3 text-sm text-[#F4F4FA] outline-none focus:ring-2 focus:ring-[#6366F1]";

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerAction,
    {} as { error?: string },
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-[#A5A5C0]">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-[#A5A5C0]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-[#A5A5C0]">
          Password (8 to 72 characters)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
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
        className="h-11 w-full rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

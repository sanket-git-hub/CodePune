"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ruleExtract, type Extracted } from "@/lib/rule-extract";
import { SAMPLE_NOTES, LAST_DAY_PROMPTS } from "@/lib/demo-data";

const MAX = 5000;

const GROUPS: { key: keyof Extracted; label: string }[] = [
  { key: "decisions", label: "Decisions" },
  { key: "risks", label: "Risks" },
  { key: "owners", label: "Owners" },
  { key: "tasks", label: "Open work" },
];

export function CaptureClient() {
  const [mode, setMode] = useState<"quick" | "lastday">("quick");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Extracted | null>(null);

  const total = result
    ? Object.values(result).reduce((n, list) => n + list.length, 0)
    : 0;

  const addPrompt = (p: string) =>
    setText((t) => (t ? `${t}\n${p} ` : `${p} `).slice(0, MAX));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Capture mode"
          className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
        >
          {(["quick", "lastday"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-10 rounded-lg px-4 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-[#6366F1] text-white"
                  : "text-[#A5A5C0] hover:text-[#F4F4FA]"
              }`}
            >
              {m === "quick" ? "Quick Capture" : "Last Day Mode"}
            </button>
          ))}
        </div>
        <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1 text-xs text-[#F59E0B]">
          Local demo · human review required
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {mode === "lastday" && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-[#A5A5C0]">
              Tap a question to add it to your notes, then answer it.
            </p>
            <div className="flex flex-wrap gap-2">
              {LAST_DAY_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => addPrompt(p)}
                  className="min-h-10 rounded-lg border border-white/10 px-3 text-left text-sm text-[#F4F4FA] hover:bg-white/5"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <label htmlFor="notes" className="sr-only">
          Notes
        </label>
        <textarea
          id="notes"
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste meeting notes, a Slack thread, or just brain-dump what you know..."
          className="h-52 w-full resize-y rounded-xl border border-white/10 bg-[#0B0B14] p-4 text-sm outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1]"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => setResult(ruleExtract(text))}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition active:scale-[0.97] disabled:opacity-50"
          >
            <Sparkles size={16} aria-hidden="true" /> Extract knowledge
          </button>
          <button
            type="button"
            onClick={() => {
              setText(SAMPLE_NOTES);
              setResult(null);
            }}
            className="h-11 rounded-xl border border-white/10 px-5 text-sm font-medium hover:bg-white/5"
          >
            Use sample notes
          </button>
          <span className="text-sm text-[#A5A5C0]">
            Rule-based demo extraction · {text.length}/{MAX}
          </span>
        </div>
      </div>

      {result === null ? (
        <div className="py-10 text-center text-sm text-[#A5A5C0]">
          <Sparkles size={22} className="mx-auto mb-3" aria-hidden="true" />
          Nothing here yet. Future you will thank you.
        </div>
      ) : total === 0 ? (
        <p className="py-8 text-center text-sm text-[#A5A5C0]">
          Nothing clear found. Try sentences like “We decided to…” or “Aarav
          owns…”.
        </p>
      ) : (
        <section aria-label="Extracted knowledge" className="space-y-3">
          <p className="text-sm text-[#A5A5C0]">
            Found {total} items. Review them before anything is saved. Saving to
            the database is the next step.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map(({ key, label }) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h2 className="flex items-center justify-between text-sm font-semibold">
                  {label}
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-[#A5A5C0]">
                    {result[key].length}
                  </span>
                </h2>
                {result[key].length === 0 ? (
                  <p className="mt-3 text-sm text-[#A5A5C0]">None found.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {result[key].map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-white/10 bg-[#0B0B14] p-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

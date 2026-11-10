"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { Decision } from "@/lib/demo-data";

export function DecisionList({ decisions }: { decisions: Decision[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Held in memory only for now. It will be saved to the database later.
  const [understood, setUnderstood] = useState<string[]>([]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decisions;
    return decisions.filter((d) =>
      [d.title, d.tag, d.by, d.why, d.rejected].some((t) =>
        t.toLowerCase().includes(q),
      ),
    );
  }, [query, decisions]);

  const toggleUnderstood = (id: string) =>
    setUnderstood((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search decisions"
          placeholder="Search decisions, people, or tags..."
          className="h-11 w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1]"
        />
        <p className="text-sm text-[#A5A5C0]" aria-live="polite">
          {shown.length} of {decisions.length} decisions · {understood.length}{" "}
          understood
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-[#A5A5C0]">
          No decisions match that search.
        </p>
      ) : (
        <ul className="space-y-4">
          {shown.map((d) => {
            const isOpen = openId === d.id;
            return (
              <li
                key={d.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-[#6366F1]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-1 text-xs text-[#C4B5FD]">
                    {d.tag}
                  </span>
                  <span className="text-sm text-[#A5A5C0]">{d.date}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : d.id)}
                  aria-expanded={isOpen}
                  aria-controls={`detail-${d.id}`}
                  className="mt-3 flex min-h-10 w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
                >
                  <h2 className="text-lg font-semibold">{d.title}</h2>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-[#A5A5C0] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <dl id={`detail-${d.id}`} className="mt-3 space-y-3 text-sm">
                    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                      <dt className="text-[#A5A5C0]">Why we decided</dt>
                      <dd>{d.why}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                      <dt className="text-[#A5A5C0]">Alternatives rejected</dt>
                      <dd>{d.rejected}</dd>
                    </div>
                  </dl>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-[#A5A5C0]">
                    <Avatar name={d.by} /> Decided by {d.by}
                  </span>
                  <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-[#A5A5C0]">
                    <input
                      type="checkbox"
                      checked={understood.includes(d.id)}
                      onChange={() => toggleUnderstood(d.id)}
                      className="h-4 w-4 accent-[#6366F1]"
                    />
                    Mark as understood
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

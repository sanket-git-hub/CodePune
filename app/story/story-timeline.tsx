"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { Decision } from "@/lib/demo-data";
import type { Chapter } from "@/lib/demo-data-extra";

export function StoryTimeline({
  chapters,
  decisions,
}: {
  chapters: Chapter[];
  decisions: Decision[];
}) {
  const [mode, setMode] = useState<"story" | "log">("story");
  const [openId, setOpenId] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(decisions.map((d) => [d.id, d])),
    [decisions],
  );
  const sorted = useMemo(
    () =>
      [...decisions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
    [decisions],
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div
          role="tablist"
          aria-label="View"
          className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
        >
          {(["story", "log"] as const).map((m) => (
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
              {m === "story" ? "Story view" : "Classic decision log"}
            </button>
          ))}
        </div>
        <span className="text-xs uppercase tracking-wide text-[#A5A5C0]">
          January — November 2026
        </span>
      </div>

      {mode === "story" ? (
        <ol className="relative ml-3 border-l border-[#6366F1]/30">
          {chapters.map((c) => {
            const isOpen = openId === c.id;
            const labelColor =
              c.tone === "amber" ? "text-[#F5A84B]" : "text-[#A78BFA]";
            const linked = c.decisionIds
              .map((id) => byId.get(id))
              .filter((d): d is Decision => !!d);

            return (
              <li key={c.id} className="relative pb-12 pl-8 last:pb-2 sm:pl-10">
                <span
                  aria-hidden="true"
                  className="absolute -left-[9px] top-1 flex h-[17px] w-[17px] items-center justify-center rounded-full border border-[#8B5CF6] bg-[#0B0B14]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                </span>

                <p
                  className={`text-xs font-semibold uppercase tracking-[0.14em] ${labelColor}`}
                >
                  {c.label}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-story)] text-3xl font-semibold leading-tight sm:text-4xl">
                  {c.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-[#A5A5C0]">
                  {c.summary}
                </p>
                <p className="mt-4 flex items-center gap-2 text-sm text-[#A5A5C0]">
                  <Avatar name={c.who} /> {c.storyOf} · {c.tag}
                </p>

                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  aria-controls={`context-${c.id}`}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg text-sm text-[#C4B5FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
                >
                  Read the context
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`context-${c.id}`}
                    className="mt-1 max-w-2xl rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <p>{c.context}</p>
                    <p className="mt-4 text-xs uppercase tracking-wide text-[#A5A5C0]">
                      Linked decisions
                    </p>
                    <ul className="mt-2 space-y-1">
                      {linked.map((d) => (
                        <li key={d.id}>
                          {d.title}{" "}
                          <span className="text-[#A5A5C0]">· {d.date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          {sorted.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
            >
              <span className="w-28 shrink-0 text-sm text-[#A5A5C0]">
                {d.date}
              </span>
              <span className="rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2.5 py-1 text-xs text-[#C4B5FD]">
                {d.tag}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">
                {d.title}
              </span>
              <span className="flex items-center gap-2 text-sm text-[#A5A5C0]">
                <Avatar name={d.by} size={24} /> {d.by}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

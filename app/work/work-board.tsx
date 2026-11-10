"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  WORK_STATUSES,
  STATUS_LABELS,
  type WorkItem,
  type WorkStatus,
} from "@/lib/demo-data-extra";

export function WorkBoard({ initial }: { initial: WorkItem[] }) {
  // Kept in memory only for now. It will be saved to the database later.
  const [items, setItems] = useState<WorkItem[]>(initial);
  const [announce, setAnnounce] = useState("");

  const move = (id: string, value: string) => {
    if (!WORK_STATUSES.includes(value as WorkStatus)) return;
    const status = value as WorkStatus;
    const item = items.find((i) => i.id === id);
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
    if (item) setAnnounce(`${item.title} moved to ${STATUS_LABELS[status]}`);
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="flex snap-x gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-4 xl:overflow-visible">
        {WORK_STATUSES.map((status) => {
          const list = items.filter((i) => i.status === status);
          return (
            <section
              key={status}
              aria-label={STATUS_LABELS[status]}
              className="min-w-[270px] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.02] p-4 xl:min-w-0"
            >
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                {STATUS_LABELS[status]}
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-[#A5A5C0]">
                  {list.length}
                </span>
              </h2>

              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-[#A5A5C0]">
                  Nothing here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {list.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-xl border border-white/10 bg-[#12121F] p-4 transition hover:-translate-y-0.5 hover:border-[#6366F1]/40"
                    >
                      <h3 className="font-semibold leading-snug">{i.title}</h3>
                      {i.status === "blocked" && (
                        <span className="mt-2 inline-block rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2 py-0.5 text-xs text-[#FB7185]">
                          Blocked
                        </span>
                      )}
                      <p className="mt-3 text-sm font-semibold text-[#A5A5C0]">
                        Where I left off
                      </p>
                      <p className="mt-1 text-sm text-[#A5A5C0]">{i.note}</p>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Avatar name={i.owner} /> {i.owner}
                        </span>
                        <span className="text-[#A5A5C0]">{i.due}</span>
                      </div>

                      <select
                        value={i.status}
                        onChange={(e) => move(i.id, e.target.value)}
                        aria-label={`Status for ${i.title}`}
                        className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-[#0B0B14] px-3 text-sm outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1]"
                      >
                        {WORK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

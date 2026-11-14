"use client";

import { useState } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Download,
} from "lucide-react";
import { PEOPLE, type Person } from "@/lib/demo-data";
import { Avatar } from "@/components/avatar";

const PERSON_LIST = Object.keys(PEOPLE) as Person[];

const STEPS = [
  { num: 1, label: "Choose people" },
  { num: 2, label: "Review gaps" },
  { num: 3, label: "Generate" },
  { num: 4, label: "Sign off" },
];

export function BriefClient() {
  const [leaving, setLeaving] = useState<string>("Aarav");
  const [takingOver, setTakingOver] = useState<string>("Priya");
  const [generated, setGenerated] = useState<boolean>(false);
  const [signedOff, setSignedOff] = useState<boolean>(false);

  const handleGenerate = () => {
    if (leaving && takingOver && leaving !== takingOver) {
      setGenerated(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        {STEPS.map((s) => {
          const isActive =
            s.num === 1 ||
            (generated && s.num <= 3) ||
            (signedOff && s.num === 4);
          return (
            <div key={s.num} className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30"
                    : "border border-white/10 bg-white/5 text-[#A5A5C0]"
                }`}
              >
                {s.num}
              </span>
              <span
                className={isActive ? "font-medium text-[#F4F4FA]" : "text-[#A5A5C0]"}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Control Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="leaving-select"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]"
            >
              Person leaving
            </label>
            <select
              id="leaving-select"
              value={leaving}
              onChange={(e) => setLeaving(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#12121F] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Choose person</option>
              {PERSON_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="pb-3 text-[#A5A5C0]">
            <ArrowRight size={20} />
          </div>

          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="taking-select"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]"
            >
              Person taking over
            </label>
            <select
              id="taking-select"
              value={takingOver}
              onChange={(e) => setTakingOver(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#12121F] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Choose person</option>
              {PERSON_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!leaving || !takingOver || leaving === takingOver}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20 transition active:scale-[0.98] disabled:opacity-40"
          >
            <Sparkles size={16} />
            Generate handover brief
          </button>
        </div>

        <p className="mt-4 text-xs text-[#A5A5C0]">
          Built from captured data on this device. No external AI service.
        </p>
      </div>

      {/* Main Content Area */}
      {!generated ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#A5A5C0]">
            <FileText size={32} />
          </div>
          <h2 className="text-xl font-semibold text-[#F4F4FA]">
            Your context, ready to pass on.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[#A5A5C0]">
            Choose the people above to generate a handover.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="rounded-md border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 text-xs font-medium text-[#34D399]">
                  Generated &middot; Ready for handover
                </span>
                <h2 className="mt-2 text-2xl font-semibold text-[#F4F4FA]">
                  Handover Packet: {leaving} &rarr; {takingOver}
                </h2>
                <p className="mt-1 text-sm text-[#A5A5C0]">
                  Project: Campus Pay &middot; Primary scope: Payments &amp; Billing
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/api/handover/export"
                  download
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-[#F4F4FA] hover:bg-white/10"
                >
                  <Download size={15} /> Download PDF
                </a>
                {!signedOff ? (
                  <button
                    type="button"
                    onClick={() => setSignedOff(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] px-5 text-sm font-medium text-white shadow-lg shadow-[#10B981]/20"
                  >
                    <CheckCircle2 size={16} /> Sign off &amp; Accept
                  </button>
                ) : (
                  <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#10B981]/40 bg-[#10B981]/15 px-4 text-sm font-medium text-[#34D399]">
                    <CheckCircle2 size={16} /> Signed off by {takingOver}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                  Readiness Score
                </p>
                <p className="mt-1 text-2xl font-bold text-[#F4F4FA]">72%</p>
                <p className="mt-1 text-xs text-[#A5A5C0]">18 of 25 checks verified</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                  Gaps to resolve
                </p>
                <p className="mt-1 text-2xl font-bold text-[#F59E0B]">2</p>
                <p className="mt-1 text-xs text-[#A5A5C0]">
                  Single-owner risk &middot; blocked legal
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12121F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#A5A5C0]">
                  Verified decisions
                </p>
                <p className="mt-1 text-2xl font-bold text-[#8B5CF6]">24</p>
                <p className="mt-1 text-xs text-[#A5A5C0]">Reasons preserved</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-base font-semibold text-[#F4F4FA]">
                Critical Gaps &amp; Next Actions
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#FB7185]" />
                  <div>
                    <p className="text-sm font-semibold text-[#FB7185]">
                      Payments has no backup owner
                    </p>
                    <p className="mt-1 text-sm text-[#A5A5C0]">
                      Action: Pair {takingOver} with {leaving} to record an architecture walkthrough and designate secondary coverage.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                  <div>
                    <p className="text-sm font-semibold text-[#F59E0B]">
                      Refund flow blocked on legal policy
                    </p>
                    <p className="mt-1 text-sm text-[#A5A5C0]">
                      Action: Draft is in the payments repo; follow up with legal to unblock deployment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

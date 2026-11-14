"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Search, FileText, Loader2 } from "lucide-react";
import { askQuestionAction } from "@/app/actions/ask-actions";
import { testPdfExportLeak } from "@/app/actions/pdf-leak-actions";

type Marker = {
  name: string;
  tag: string;
  marker: string;
};

export function LeakTestClient({
  userRole,
  clearance,
  visibleMarkerChunks,
  markers,
}: {
  userRole: string;
  clearance: string[];
  visibleMarkerChunks: number;
  markers: Marker[];
}) {
  const [testing, setTesting] = useState(false);
  const [askResults, setAskResults] = useState<
    { marker: string; question: string; answer: string; leaked: boolean }[] | null
  >(null);

  const [pdfTesting, setPdfTesting] = useState(false);
  const [pdfResult, setPdfResult] = useState<{
    leaked: boolean;
    claimsCount: number;
    hiddenCount: number;
  } | null>(null);

  const runAskLeakTest = async () => {
    setTesting(true);
    const results = [];

    for (const m of markers) {
      const q = `Tell me about ${m.name} or confidential salary bands and monthly values`;
      try {
        const res = await askQuestionAction(q);
        const answer = res.data?.answer || res.error || "No response";
        const leaked = answer.includes(m.marker);
        results.push({ marker: m.marker, question: q, answer, leaked });
      } catch (err: unknown) {
        results.push({
          marker: m.marker,
          question: q,
          answer: err instanceof Error ? err.message : "Error",
          leaked: false,
        });
      }
    }

    setAskResults(results);
    setTesting(false);
  };

  const runPdfLeakTest = async () => {
    setPdfTesting(true);
    try {
      const res = await testPdfExportLeak();
      setPdfResult({
        leaked: res.leaked,
        claimsCount: res.claimsCount,
        hiddenCount: res.hiddenCount,
      });
    } catch {
      setPdfResult(null);
    } finally {
      setPdfTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Clearance Status Card */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-base font-semibold text-white">Your Role & SQL Clearance</h2>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-3">
            <span className="text-[#A5A5C0]">Logged-in Role:</span>
            <p className="mt-1 font-semibold capitalize text-white">{userRole}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-3">
            <span className="text-[#A5A5C0]">Access Clearance Tags:</span>
            <div className="mt-1 flex gap-1.5">
              {clearance.map((tag) => (
                <span key={tag} className="rounded bg-white/10 px-2 py-0.5 uppercase text-white font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-3">
            <span className="text-[#A5A5C0]">Database Leak Markers Visible:</span>
            <p className="mt-1 font-semibold text-white">{visibleMarkerChunks} chunks</p>
          </div>
        </div>

        <div className="mt-4">
          {visibleMarkerChunks === 0 ? (
            <p className="flex items-center gap-2 text-xs text-[#34D399]">
              <CheckCircle2 size={15} /> SQL filter blocked all planted confidential markers from this role.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-xs text-[#F59E0B]">
              <ShieldAlert size={15} /> Your role clearance has access to HR or Finance tagged data.
            </p>
          )}
        </div>
      </div>

      {/* PDF Export Leak Check Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">PDF Export Clearance Test</h2>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Simulates GET /api/handover/export with your role to confirm confidential marker strings are never rendered in exported documents.
            </p>
          </div>
          <button
            type="button"
            onClick={runPdfLeakTest}
            disabled={pdfTesting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6366F1] px-4 text-xs font-semibold text-white hover:bg-[#5558E6] disabled:opacity-50"
          >
            {pdfTesting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Run PDF Leak Audit
          </button>
        </div>

        {pdfResult && (
          <div className="mt-4 rounded-lg border border-white/10 bg-[#0B0B14] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#A5A5C0]">
                Exported: <strong>{pdfResult.claimsCount}</strong> claims | Hidden by clearance: <strong>{pdfResult.hiddenCount}</strong> items
              </span>
              {pdfResult.leaked ? (
                <span className="flex items-center gap-1 font-semibold text-[#FB7185]">
                  <XCircle size={14} /> LEAK DETECTED IN PDF
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-[#34D399]">
                  <ShieldCheck size={14} /> PROTECTED (No markers leaked into PDF)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ask Q&A Leak Audit Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Ask Q&A Probe Test</h2>
            <p className="mt-1 text-xs text-[#A5A5C0]">
              Tests whether asking targeted questions can retrieve planted leak markers through Gemini responses.
            </p>
          </div>
          <button
            type="button"
            onClick={runAskLeakTest}
            disabled={testing}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6366F1] px-4 text-xs font-semibold text-white hover:bg-[#5558E6] disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Run Ask Leak Audit
          </button>
        </div>

        {askResults && (
          <div className="mt-6 space-y-4">
            {askResults.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-[#0B0B14] p-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[#A5A5C0]">Target Marker: <code className="text-white">{r.marker}</code></span>
                  {r.leaked ? (
                    <span className="flex items-center gap-1 font-semibold text-[#FB7185]">
                      <XCircle size={14} /> LEAK DETECTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-[#34D399]">
                      <ShieldCheck size={14} /> PROTECTED (No leak)
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[#A5A5C0]"><strong className="text-white">Query:</strong> {r.question}</p>
                <p className="mt-2 text-[#D1D1E6]"><strong className="text-white">Gemini Answer:</strong> {r.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sparkles, Github, MessageSquareText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ruleExtract, type Extracted } from "@/lib/rule-extract";
import { SAMPLE_NOTES, LAST_DAY_PROMPTS } from "@/lib/demo-data";
import { importGithubRepoAction, type ImportGithubResponse } from "@/app/actions/github-import-actions";
import { importChatJsonAction, type ImportChatResponse } from "@/app/actions/chat-import-actions";

const MAX = 5000;

const GROUPS: { key: keyof Extracted; label: string }[] = [
  { key: "decisions", label: "Decisions" },
  { key: "risks", label: "Risks" },
  { key: "owners", label: "Owners" },
  { key: "tasks", label: "Open work" },
];

export function CaptureClient() {
  const [mode, setMode] = useState<"quick" | "lastday" | "github" | "chat">("quick");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Extracted | null>(null);

  // GitHub Import State
  const [repoInput, setRepoInput] = useState("");
  const [ghAccessTag, setGhAccessTag] = useState<"public" | "eng" | "hr" | "finance">("public");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghResult, setGhResult] = useState<ImportGithubResponse | null>(null);

  // Chat Import State
  const [chatTitle, setChatTitle] = useState("");
  const [chatJsonContent, setChatJsonContent] = useState("");
  const [chatAccessTag, setChatAccessTag] = useState<"public" | "eng" | "hr" | "finance">("eng");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState<ImportChatResponse | null>(null);

  const total = result
    ? Object.values(result).reduce((n, list) => n + list.length, 0)
    : 0;

  const addPrompt = (p: string) =>
    setText((t) => (t ? `${t}\n${p} ` : `${p} `).slice(0, MAX));

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setGhLoading(true);
    setGhResult(null);

    const res = await importGithubRepoAction(repoInput, ghAccessTag);
    setGhResult(res);
    setGhLoading(false);
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!chatTitle) {
      setChatTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setChatJsonContent(content || "");
    };
    reader.readAsText(file);
  };

  const handleChatImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTitle.trim() || !chatJsonContent.trim()) return;

    setChatLoading(true);
    setChatResult(null);

    const res = await importChatJsonAction(chatTitle, chatJsonContent, chatAccessTag);
    setChatResult(res);
    setChatLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Capture mode"
          className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "quick"}
            onClick={() => setMode("quick")}
            className={`h-10 rounded-lg px-4 text-sm font-medium ${
              mode === "quick"
                ? "bg-[#6366F1] text-white"
                : "text-[#A5A5C0] hover:text-[#F4F4FA]"
            }`}
          >
            Quick Capture
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "lastday"}
            onClick={() => setMode("lastday")}
            className={`h-10 rounded-lg px-4 text-sm font-medium ${
              mode === "lastday"
                ? "bg-[#6366F1] text-white"
                : "text-[#A5A5C0] hover:text-[#F4F4FA]"
            }`}
          >
            Last Day Mode
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "github"}
            onClick={() => setMode("github")}
            className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium ${
              mode === "github"
                ? "bg-[#6366F1] text-white"
                : "text-[#A5A5C0] hover:text-[#F4F4FA]"
            }`}
          >
            <Github size={15} /> GitHub Import
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "chat"}
            onClick={() => setMode("chat")}
            className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium ${
              mode === "chat"
                ? "bg-[#6366F1] text-white"
                : "text-[#A5A5C0] hover:text-[#F4F4FA]"
            }`}
          >
            <MessageSquareText size={15} /> Chat Export (JSON)
          </button>
        </div>
      </div>

      {/* Chat Export JSON View */}
      {mode === "chat" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2.5">
            <MessageSquareText size={20} className="text-[#8B5CF6]" />
            <h2 className="text-base font-semibold text-white">Import Chat Export (JSON)</h2>
          </div>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Accepts either a custom schema (<code className="text-[#C4B5FD]">&#123;&quot;messages&quot;:[&#123;&quot;author&quot;,&quot;timestamp&quot;,&quot;text&quot;&#125;]&#125;</code>)
            or a Slack-style array (<code className="text-[#C4B5FD]">[&#123;&quot;user&quot;,&quot;text&quot;,&quot;ts&quot;&#125;]</code>). Max 1 MB.
            Secrets, emails, and phone numbers are masked before chunks are stored.
          </p>

          <form onSubmit={handleChatImport} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="chat-title" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                  Source Title
                </label>
                <input
                  id="chat-title"
                  type="text"
                  value={chatTitle}
                  onChange={(e) => setChatTitle(e.target.value)}
                  placeholder="e.g. Payments Migration Slack Channel"
                  disabled={chatLoading}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0B0B14] px-4 text-sm text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="chat-access-tag" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                  Access Tag Clearance
                </label>
                <select
                  id="chat-access-tag"
                  value={chatAccessTag}
                  onChange={(e) => setChatAccessTag(e.target.value as any)}
                  disabled={chatLoading}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0B0B14] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
                >
                  <option value="eng">eng (Engineering only)</option>
                  <option value="public">public (Visible to all team members)</option>
                  <option value="hr">hr (HR only)</option>
                  <option value="finance">finance (Finance only)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                Upload JSON File
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleChatFileUpload}
                disabled={chatLoading}
                className="mt-2 block w-full text-xs text-[#A5A5C0] file:mr-4 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-[#F4F4FA] hover:file:bg-white/10"
              />
            </div>

            <div>
              <label htmlFor="chat-content" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                Or Paste JSON Content directly
              </label>
              <textarea
                id="chat-content"
                value={chatJsonContent}
                onChange={(e) => setChatJsonContent(e.target.value)}
                rows={6}
                placeholder='[{"user": "Aarav", "ts": "1710234000", "text": "Decision: We chose Stripe..."}]'
                disabled={chatLoading}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0B14] p-3 font-mono text-xs text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={chatLoading || !chatTitle.trim() || !chatJsonContent.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-medium text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50"
            >
              {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
              Import Chat Messages
            </button>
          </form>

          {/* Chat Import Status */}
          {chatResult && (
            <div className="mt-6">
              {chatResult.success ? (
                <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-sm text-[#34D399]">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={18} />
                    Successfully imported {chatResult.title}
                  </div>
                  <p className="mt-2 text-xs text-[#34D399]/90">
                    <strong>{chatResult.secretsMasked}</strong> secrets masked &middot; <strong>{chatResult.chunksCount}</strong> message chunks saved as source.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4 text-sm text-[#FB7185]">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle size={18} />
                    Import failed
                  </div>
                  <p className="mt-1 text-xs text-[#FB7185]/90 whitespace-pre-line">{chatResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GitHub Import View */}
      {mode === "github" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2.5">
            <Github size={20} className="text-[#8B5CF6]" />
            <h2 className="text-base font-semibold text-white">Import Public GitHub Repository</h2>
          </div>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            Fetches README, up to 30 recent issues, pull requests with comments, and commit messages (capped at 200 KB).
            Secrets, emails, and phone numbers are screened and masked before saving.
          </p>

          <form onSubmit={handleGithubImport} className="mt-5 space-y-4">
            <div>
              <label htmlFor="repo-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                Repository (owner/repo or github.com URL)
              </label>
              <input
                id="repo-input"
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="e.g. facebook/react or https://github.com/torvalds/subsurface-for-dirk"
                disabled={ghLoading}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0B0B14] px-4 text-sm text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="access-tag" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5C0]">
                Access Tag Clearance
              </label>
              <select
                id="access-tag"
                value={ghAccessTag}
                onChange={(e) => setGhAccessTag(e.target.value as any)}
                disabled={ghLoading}
                className="mt-2 h-11 w-full max-w-xs rounded-xl border border-white/10 bg-[#0B0B14] px-3.5 text-sm text-[#F4F4FA] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#6366F1] disabled:opacity-50"
              >
                <option value="public">public (Visible to all team members)</option>
                <option value="eng">eng (Engineering only)</option>
                <option value="hr">hr (HR only)</option>
                <option value="finance">finance (Finance only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={ghLoading || !repoInput.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-medium text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50"
            >
              {ghLoading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
              Import Repository
            </button>
          </form>

          {/* GitHub Import Status Messages */}
          {ghResult && (
            <div className="mt-6">
              {ghResult.success ? (
                <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-sm text-[#34D399]">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={18} />
                    Successfully imported {ghResult.repo}
                  </div>
                  <p className="mt-2 text-xs text-[#34D399]/90">
                    <strong>{ghResult.secretsMasked}</strong> secrets masked &middot; <strong>{ghResult.chunksCount}</strong> chunks saved into Claim Ledger source.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-4 text-sm text-[#FB7185]">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle size={18} />
                    Import failed
                  </div>
                  <p className="mt-1 text-xs text-[#FB7185]/90">{ghResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text Notes Capture View */}
      {mode !== "github" && mode !== "chat" && (
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
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-medium text-white hover:bg-[#5558E6] focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50"
            >
              <Sparkles size={16} aria-hidden="true" /> Extract knowledge
            </button>
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE_NOTES);
                setResult(null);
              }}
              className="h-11 rounded-xl border border-white/10 px-5 text-sm font-medium hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#6366F1]"
            >
              Use sample notes
            </button>
          </div>
        </div>
      )}

      {/* Extracted Knowledge Preview */}
      {mode !== "github" && mode !== "chat" && result !== null && (
        <section aria-label="Extracted knowledge" className="space-y-3">
          <p className="text-sm text-[#A5A5C0]">
            Found {total} items. Review them before anything is saved.
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

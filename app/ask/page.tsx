import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export default async function AskPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="Ask Baton">
      <PageHeader
        title="Ask Baton"
        subtitle="Query knowledge, historical decisions, and system ownership using natural language."
      />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/10 text-[#8B5CF6]">
          <Sparkles size={28} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#F4F4FA]">
          AI Assistant Q&amp;A
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#A5A5C0]">
          Ask questions against the screened knowledge base. Baton retrieves
          relevant approved claims and citations according to your clearance
          level.
        </p>

        <div className="mx-auto mt-6 max-w-lg">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Why did we choose Stripe over Razorpay?"
              className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0B0B14] px-4 text-sm text-[#F4F4FA] outline-none placeholder:text-[#A5A5C0] focus:ring-2 focus:ring-[#6366F1]"
              readOnly
            />
            <button
              type="button"
              className="h-11 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 text-sm font-medium text-white shadow-lg shadow-[#6366F1]/20"
            >
              Ask
            </button>
          </div>
          <p className="mt-3 text-xs text-[#A5A5C0]">
            Demo preview &middot; Knowledge synthesis coming soon
          </p>
        </div>
      </div>
    </AppShell>
  );
}

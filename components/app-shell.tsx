import Link from "next/link";
import type { ReactNode } from "react";
import { Inter, Fraunces } from "next/font/google";
import { SidebarNav, BottomNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { Avatar } from "./avatar";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-story" });

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
        <rect
          x="5"
          y="3"
          width="6"
          height="14"
          rx="3"
          transform="rotate(20 8 10)"
          fill="#8B5CF6"
        />
        <rect
          x="13"
          y="9"
          width="6"
          height="14"
          rx="3"
          transform="rotate(20 16 16)"
          fill="#6366F1"
        />
      </svg>
      <span className="hidden text-xl font-semibold tracking-tight text-white lg:inline">
        ByeByeBrain<span className="text-[#8B5CF6]">.</span>
      </span>
    </div>
  );
}

export function AppShell({
  user,
  section,
  projectName = "Campus Pay",
  handover = { from: "Riya", to: "Arjun" },
  isDemo = true,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: string };
  section: string;
  projectName?: string | null;
  handover?: { from: string; to: string } | null;
  isDemo?: boolean;
  children: ReactNode;
}) {
  const display = user.name ?? user.email ?? "Signed in";

  return (
    <div
      className={`${inter.variable} ${fraunces.variable} flex min-h-screen bg-[#0B0B14] font-[family-name:var(--font-ui)] text-[#F4F4FA]`}
    >
      {/* Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#0E0E1A] p-3 md:flex md:w-[72px] lg:w-64 lg:p-4">
        <div className="mb-4 flex justify-center lg:justify-start">
          <Logo />
        </div>

        {/* Project Card */}
        <div className="mb-4 hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:block">
          <p className="text-sm font-medium text-white">{projectName ?? "Workspace"}</p>
          <p className="mt-0.5 text-xs text-[#A5A5C0]">
            {isDemo ? "Campus Pay · Demo project" : "Project workspace"}
          </p>
        </div>

        {/* Nav with role filtering */}
        <SidebarNav userRole={user.role} />

        {/* User Card at Bottom */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 lg:justify-start">
            <Avatar name={display} size={32} />
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-medium text-white">{display}</p>
              <p className="text-xs capitalize text-[#A5A5C0]">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0B0B14] px-4 md:px-8">
          <p className="truncate text-sm text-[#A5A5C0]">
            {projectName ?? "ByeByeBrain"} <span className="mx-2 text-white/20">/</span>
            <span className="text-[#F4F4FA]">{section}</span>
          </p>

          <div className="flex items-center gap-2 sm:gap-3">
            {isDemo && (
              <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                Demo data
              </span>
            )}
            {handover && (
              <span className="hidden rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-[#A5A5C0] sm:inline">
                From: {handover.from} &rarr; To: {handover.to}
              </span>
            )}
            <LogoutButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-24 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav userRole={user.role} />
    </div>
  );
}

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
  projectName,
  handover,
  isDemo = false,
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
  const activeProject = projectName ?? (isDemo ? "Campus Pay" : "Workspace");
  const activeHandover = handover ?? (isDemo ? { from: "Riya", to: "Arjun" } : null);

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
        <Link
          href="/projects"
          className="mb-4 hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#6366F1]/50 hover:bg-white/[0.05] lg:block group"
        >
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-white group-hover:text-[#C4B5FD]">{activeProject}</p>
            <span className="text-[10px] font-semibold text-[#8B5CF6] group-hover:underline">Switch</span>
          </div>
          <p className="mt-0.5 text-xs text-[#A5A5C0]">
            {isDemo ? "Campus Pay · Demo project" : "Project workspace"}
          </p>
        </Link>

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
            {activeProject} <span className="mx-2 text-white/20">/</span>
            <span className="text-[#F4F4FA]">{section}</span>
          </p>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 hover:border-white/30"
            >
              <span>Projects</span>
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1 rounded-lg bg-[#6366F1] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4F46E5]"
            >
              <span>+ New</span>
            </Link>
            {isDemo && (
              <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
                Demo data
              </span>
            )}
            {activeHandover && (
              <span className="hidden rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-[#A5A5C0] sm:inline">
                From: {activeHandover.from} &rarr; To: {activeHandover.to}
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

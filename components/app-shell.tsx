import Link from "next/link";
import type { ReactNode } from "react";
import { Inter, Fraunces } from "next/font/google";
import { SidebarNav, BottomNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { Avatar } from "./avatar";
import { HANDOVER } from "@/lib/demo-data";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-story" });

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
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
      <span className="hidden text-xl font-semibold tracking-tight lg:inline">
        Baton<span className="text-[#8B5CF6]">.</span>
      </span>
    </div>
  );
}

export function AppShell({
  user,
  section,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: string };
  section: string;
  children: ReactNode;
}) {
  const display = user.name ?? user.email ?? "Signed in";

  return (
    <div
      className={`${inter.variable} ${fraunces.variable} flex min-h-screen bg-[#0B0B14] font-[family-name:var(--font-ui)] text-[#F4F4FA]`}
    >
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#0E0E1A] p-3 md:flex md:w-[72px] lg:w-64 lg:p-4">
        <div className="mb-4 flex justify-center lg:justify-start">
          <Logo />
        </div>

        <div className="mb-4 hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:block">
          <p className="text-sm font-medium">Orbit workspace</p>
          <p className="mt-1 text-xs text-[#A5A5C0]">
            SaaS platform · Demo project
          </p>
        </div>

        <SidebarNav />

        <div className="mt-auto space-y-3">
          <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#A5A5C0] lg:block">
            <p className="font-medium uppercase tracking-wide">
              A good handover starts here.
            </p>
            <p className="mt-2">
              A little more context. A lot less “quick question”.
            </p>
            <Link href="/capture" className="mt-3 inline-block text-[#C4B5FD]">
              Capture something →
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <Avatar name={display.includes("Priya") ? "Priya" : display} size={32} />
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-medium">
                {display === "Signed in" || display.includes("Priya")
                  ? "Priya Sharma"
                  : display}
              </p>
              <p className="text-xs text-[#A5A5C0]">Your next chapter</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0B0B14]/90 px-4 backdrop-blur md:px-8">
          <p className="truncate text-sm text-[#A5A5C0]">
            Orbit <span className="mx-2">/</span>
            <span className="text-[#F4F4FA]">{section}</span>
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#A5A5C0] md:flex">
              <span>⌘K</span>
            </div>
            <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#A5A5C0]">
              {HANDOVER.from} → {HANDOVER.to}
            </span>
            <Avatar name="Priya" size={28} />
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

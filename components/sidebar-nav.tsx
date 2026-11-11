"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Sparkles,
  FileText,
  BookOpen,
  Briefcase,
  User,
  AlertTriangle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

type Item = {
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
};

// ready:false means the page is not built yet, so it is shown dimmed and is not a link.
const ITEMS: Item[] = [
  {
    label: "Overview",
    short: "Overview",
    href: "/dashboard",
    icon: LayoutGrid,
    ready: true,
  },
  {
    label: "Quick Capture",
    short: "Capture",
    href: "/capture",
    icon: Sparkles,
    ready: true,
  },
  {
    label: "Decisions",
    short: "Decisions",
    href: "/decisions",
    icon: FileText,
    ready: true,
  },
  {
    label: "The story so far",
    short: "Story",
    href: "/story",
    icon: BookOpen,
    ready: true,
  },
  {
    label: "Open work",
    short: "Work",
    href: "/work",
    icon: Briefcase,
    ready: true,
  },
  {
    label: "Ownership map",
    short: "Owners",
    href: "/ownership",
    icon: User,
    ready: true,
  },
  {
    label: "Risk register",
    short: "Risks",
    href: "/risks",
    icon: AlertTriangle,
    ready: true,
  },
  {
    label: "Handover brief",
    short: "Brief",
    href: "/brief",
    icon: FileText,
    ready: true,
  },
  {
    label: "Ask Baton",
    short: "Ask",
    href: "/ask",
    icon: MessageSquare,
    ready: true,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const base = "flex h-10 items-center gap-3 rounded-lg px-3 text-sm";

  return (
    <nav aria-label="Main" className="space-y-1">
      {ITEMS.map(({ label, href, icon: Icon, ready }) => {
        if (!ready) {
          return (
            <span
              key={href}
              title={`${label} (coming soon)`}
              aria-disabled="true"
              className={`${base} cursor-not-allowed text-[#A5A5C0]/45`}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="hidden lg:inline">{label}</span>
              <span className="sr-only lg:hidden">{label}, coming soon</span>
            </span>
          );
        }
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`${base} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] ${
              active
                ? "bg-[#6366F1]/15 text-[#C4B5FD]"
                : "text-[#A5A5C0] hover:bg-white/5 hover:text-[#F4F4FA]"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const ready = ITEMS.filter((i) => i.ready);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-white/10 bg-[#0E0E1A]/95 backdrop-blur md:hidden"
    >
      {ready.map(({ short, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-16 min-w-[84px] flex-1 flex-col items-center justify-center gap-1 px-2 text-xs ${
              active ? "text-[#C4B5FD]" : "text-[#A5A5C0]"
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            {short}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Upload,
  FileCheck,
  CheckSquare,
  BookOpen,
  Send,
  ShieldAlert,
  Search,
  type LucideIcon,
} from "lucide-react";

type Item = {
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
  minRoles?: string[];
};

const ITEMS: Item[] = [
  {
    label: "Overview",
    short: "Overview",
    href: "/dashboard",
    icon: LayoutGrid,
    ready: true,
  },
  {
    label: "Import",
    short: "Import",
    href: "/capture",
    icon: Upload,
    ready: true,
  },
  {
    label: "Claims",
    short: "Claims",
    href: "/decisions",
    icon: FileCheck,
    ready: true,
  },
  {
    label: "Review",
    short: "Review",
    href: "/work",
    icon: CheckSquare,
    ready: true,
    minRoles: ["admin", "reviewer"],
  },
  {
    label: "Timeline",
    short: "Timeline",
    href: "/story",
    icon: BookOpen,
    ready: true,
  },
  {
    label: "Handover",
    short: "Handover",
    href: "/brief",
    icon: Send,
    ready: true,
  },
  {
    label: "Audit",
    short: "Audit",
    href: "/risks",
    icon: ShieldAlert,
    ready: true,
    minRoles: ["admin"],
  },
  {
    label: "Leak test",
    short: "Leak test",
    href: "/ask",
    icon: Search,
    ready: true,
    minRoles: ["admin", "reviewer"],
  },
];

export function SidebarNav({ userRole = "incoming" }: { userRole?: string }) {
  const pathname = usePathname();
  const base = "flex h-10 items-center gap-3 rounded-lg px-3 text-sm";

  // Filter items according to the logged-in user's role
  const visibleItems = ITEMS.filter((item) => {
    if (!item.minRoles) return true;
    if (userRole === "admin") return true;
    return item.minRoles.includes(userRole);
  });

  return (
    <nav aria-label="Main" className="space-y-1">
      {visibleItems.map(({ label, href, icon: Icon, ready }) => {
        if (!ready) {
          return (
            <span
              key={href}
              title={`${label} (coming soon)`}
              aria-disabled="true"
              className={`${base} cursor-not-allowed text-[#A5A5C0]/40`}
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
                ? "bg-[#6366F1]/15 text-[#C4B5FD] font-medium"
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

export function BottomNav({ userRole = "incoming" }: { userRole?: string }) {
  const pathname = usePathname();
  const visible = ITEMS.filter((item) => {
    if (!item.ready) return false;
    if (!item.minRoles) return true;
    if (userRole === "admin") return true;
    return item.minRoles.includes(userRole);
  });

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-white/10 bg-[#0E0E1A] md:hidden"
    >
      {visible.map(({ short, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 px-2 text-xs focus-visible:outline-2 focus-visible:outline-[#6366F1] ${
              active ? "text-[#C4B5FD] font-medium" : "text-[#A5A5C0] hover:text-white"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

import type { ReactNode } from "react";

export function PageHeader({
  eyebrow = "Orbit / Workspace",
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#A5A5C0]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-[#A5A5C0]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

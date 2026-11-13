import type { ReactNode } from "react";

export function PageHeader({
  eyebrow = "CAMPUS PAY / WORKSPACE",
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
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#A5A5C0]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-[#A5A5C0]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

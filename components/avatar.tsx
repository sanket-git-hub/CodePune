import { PEOPLE } from "@/lib/demo-data";

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const color =
    (PEOPLE as Record<string, { color: string }>)[name]?.color ?? "#2F7D6B";
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

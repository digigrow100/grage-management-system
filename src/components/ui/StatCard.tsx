import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-600",
    blue: "bg-accent-50 text-accent-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn("shrink-0 rounded-xl p-2.5 sm:p-3", toneClasses[tone])}
        >
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

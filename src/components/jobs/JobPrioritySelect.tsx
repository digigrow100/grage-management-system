"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateJobPriority } from "@/lib/supabase/mutations";
import { JOB_PRIORITIES, JOB_PRIORITY_LABELS } from "@/lib/job-status";
import type { JobPriority } from "@/lib/types";

const priorityRingColor: Record<JobPriority, string> = {
  low: "border-slate-300 text-slate-700 bg-slate-100",
  medium: "border-amber-500/40 text-amber-800 bg-amber-50",
  high: "border-rose-500/40 text-rose-800 bg-rose-50",
};

export function JobPrioritySelect({
  jobId,
  priority,
}: {
  jobId: string;
  priority: JobPriority;
}) {
  const can=usePermission();
  const router = useRouter();
  const [current, setCurrent] = useState(priority);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: JobPriority) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);

    const result = await updateJobPriority(jobId, next);

    setSaving(false);
    if (result.error) {
      setCurrent(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="relative inline-block">
        <select
          value={current}
          disabled={saving || !can("jobs.manage","jobs.update")}
          onChange={(e) => handleChange(e.target.value as JobPriority)}
          className={`appearance-none rounded-full border py-1 pl-3 pr-8 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:opacity-60 ${priorityRingColor[current]}`}
        >
          {JOB_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {JOB_PRIORITY_LABELS[value]} priority
            </option>
          ))}
        </select>
        {saving ? (
          <Loader2 size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />
        ) : (
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2"
            viewBox="0 0 10 6"
            fill="none"
          >
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

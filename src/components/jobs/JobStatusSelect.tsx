"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateJobStatus } from "@/lib/supabase/mutations";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/job-status";
import type { JobStatus } from "@/lib/types";

const statusRingColor: Record<JobStatus, string> = {
  booked: "border-accent-500/40 text-accent-700 bg-accent-50",
  checked_in: "border-violet-500/40 text-violet-800 bg-violet-50",
  in_progress: "border-amber-500/40 text-amber-800 bg-amber-50",
  awaiting_parts: "border-rose-500/40 text-rose-800 bg-rose-50",
  completed: "border-emerald-500/40 text-emerald-800 bg-emerald-50",
  vehicle_released: "border-slate-300 text-slate-700 bg-slate-100",
  invoiced: "border-slate-300 text-slate-700 bg-slate-100",
  awaiting_authorisation: "border-amber-300 text-amber-700",
  authorised: "border-blue-300 text-blue-700",
  cancelled: "border-rose-300 text-rose-700",
};

export function JobStatusSelect({ jobId, status }: { jobId: string; status: JobStatus }) {
  const can=usePermission();
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: JobStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);

    const result = await updateJobStatus(jobId, next);

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
          onChange={(e) => handleChange(e.target.value as JobStatus)}
          className={`appearance-none rounded-full border py-1 pl-3 pr-8 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:opacity-60 ${statusRingColor[current]}`}
        >
          {JOB_STATUSES.map((value) => (
            <option key={value} value={value}>
              {JOB_STATUS_LABELS[value]}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateJobTechnician } from "@/lib/supabase/mutations";
import type { Employee } from "@/lib/types";

export function JobTechnicianSelect({
  jobId,
  employeeId,
  employees,
}: {
  jobId: string;
  employeeId: string | null | undefined;
  employees: Employee[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(employeeId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);

    const employee = employees.find((e) => e.id === next);
    const result = await updateJobTechnician(jobId, employee?.fullName ?? null, next || null);

    setSaving(false);
    if (result.error) {
      setCurrent(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-slate-500">
      <span>Technician:</span>
      <div className="relative inline-block">
        <select
          value={current}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          className="appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-7 text-sm text-slate-700 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-60"
        >
          <option value="">Unassigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
        {saving ? (
          <Loader2 size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}

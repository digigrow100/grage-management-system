"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardCheck, Timer, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { convertEstimateToBooking } from "@/lib/supabase/mutations";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/job-types";
import type { Employee, JobType } from "@/lib/types";

export function ConvertEstimateButton({
  estimateId,
  employees,
}: {
  estimateId: string;
  employees: Employee[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeEmployees = employees.filter((e) => e.active);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await convertEstimateToBooking(estimateId, {
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      durationMinutes: Number(formData.get("durationMinutes") ?? 60),
      employeeId: String(formData.get("employeeId") ?? "") || undefined,
      jobType: String(formData.get("jobType") ?? "other") as JobType,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    if (result.jobId) {
      router.push(`/jobs/${result.jobId}`);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <ClipboardCheck size={15} /> Convert to booking
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Convert to Booking"
        subtitle="Schedule this estimate as a job"
        icon={ClipboardCheck}
        maxWidth="max-w-md"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Date" htmlFor="date" required>
              <TextInput id="date" name="date" type="date" icon={CalendarClock} required />
            </FieldGroup>
            <FieldGroup label="Time" htmlFor="time" required>
              <TextInput id="time" name="time" type="time" icon={CalendarClock} required defaultValue="09:00" />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Duration (mins)" htmlFor="durationMinutes">
              <TextInput
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                icon={Timer}
                min="15"
                step="15"
                defaultValue="60"
              />
            </FieldGroup>
            <FieldGroup label="Job type" htmlFor="jobType">
              <Select id="jobType" name="jobType" defaultValue="other">
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {JOB_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup label="Technician" htmlFor="employeeId">
            <Select id="employeeId" name="employeeId" icon={Wrench} defaultValue="">
              <option value="">Unassigned</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </FieldGroup>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Converting..." : "Convert"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

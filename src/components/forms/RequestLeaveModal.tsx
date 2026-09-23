"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CalendarPlus, FileText, Tag, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { requestLeave } from "@/lib/supabase/mutations";
import type { Employee, LeaveType } from "@/lib/types";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "unpaid", label: "Unpaid leave" },
  { value: "other", label: "Other" },
];

export function RequestLeaveButton({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await requestLeave({
      employeeId: String(formData.get("employeeId") ?? ""),
      leaveType: formData.get("leaveType") as LeaveType,
      startsOn: String(formData.get("startsOn") ?? ""),
      endsOn: String(formData.get("endsOn") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <CalendarPlus size={15} /> Request leave
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request Leave"
        subtitle="Submit a leave request for approval"
        icon={CalendarPlus}
        maxWidth="max-w-md"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Employee" htmlFor="employeeId" required>
            <Select id="employeeId" name="employeeId" icon={User} required defaultValue="">
              <option value="" disabled>
                Select employee
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup label="Type" htmlFor="leaveType">
            <Select id="leaveType" name="leaveType" icon={Tag} defaultValue="annual">
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Start Date" htmlFor="startsOn" required>
              <TextInput id="startsOn" name="startsOn" type="date" icon={Calendar} required />
            </FieldGroup>
            <FieldGroup label="End Date" htmlFor="endsOn" required>
              <TextInput id="endsOn" name="endsOn" type="date" icon={Calendar} required />
            </FieldGroup>
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <div className="relative">
              <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <TextArea id="notes" name="notes" rows={2} className="pl-9" />
            </div>
          </FieldGroup>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

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
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

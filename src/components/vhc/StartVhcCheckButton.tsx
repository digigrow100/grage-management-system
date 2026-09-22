"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select } from "@/components/ui/Field";
import { startVhcCheck } from "@/lib/supabase/mutations";
import type { Employee, VhcTemplate } from "@/lib/types";

export function StartVhcCheckButton({
  jobId,
  templates,
  employees,
}: {
  jobId: string;
  templates: VhcTemplate[];
  employees: Employee[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultTemplate = templates.find((t) => t.isDefault) ?? templates[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await startVhcCheck({
      jobId,
      templateId: String(formData.get("templateId") ?? "") || null,
      technicianId: String(formData.get("technicianId") ?? "") || null,
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
        <ClipboardCheck size={15} /> Start VHC
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Start Vehicle Health Check" icon={ClipboardCheck} maxWidth="max-w-md">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Template" htmlFor="templateId">
            <Select id="templateId" name="templateId" defaultValue={defaultTemplate?.id ?? ""}>
              <option value="">Blank checklist</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.items.length} items)
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup label="Technician" htmlFor="technicianId">
            <Select id="technicianId" name="technicianId" icon={User} defaultValue="">
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </FieldGroup>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-3">
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
              {submitting ? "Starting..." : "Start Check"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

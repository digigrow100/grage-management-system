"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Pencil, PoundSterling, UserPlus, Briefcase, ToggleLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { updateEmployee } from "@/lib/supabase/mutations";
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS } from "@/lib/employee-roles";
import type { Employee, EmployeeRole } from "@/lib/types";

export function EditEmployeeButton({ employee }: { employee: Employee }) {
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(employee.active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateEmployee(employee.id, {
      fullName: String(formData.get("fullName") ?? ""),
      role: String(formData.get("role") ?? "technician") as EmployeeRole,
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      hourlyRate: Number(formData.get("hourlyRate") ?? 0),
      active,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!can('employees.manage')) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${employee.fullName}`}
      >
        <Pencil size={14} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Employee"
        subtitle="Update role, contact details, and status"
        icon={Pencil}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Full Name" htmlFor="fullName" required>
            <TextInput id="fullName" name="fullName" icon={UserPlus} required defaultValue={employee.fullName} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Role" htmlFor="role" required>
              <Select id="role" name="role" icon={Briefcase} defaultValue={employee.role} required>
                {EMPLOYEE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {EMPLOYEE_ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup label="Hourly Rate (£)" htmlFor="hourlyRate">
              <TextInput
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                icon={PoundSterling}
                min="0"
                step="0.01"
                defaultValue={employee.hourlyRate}
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Email" htmlFor="email">
              <TextInput id="email" name="email" type="email" icon={Mail} defaultValue={employee.email ?? ""} />
            </FieldGroup>

            <FieldGroup label="Phone" htmlFor="phone">
              <TextInput id="phone" name="phone" icon={Phone} defaultValue={employee.phone ?? ""} />
            </FieldGroup>
          </div>

          <FieldGroup label="Status" htmlFor="active">
            <button
              type="button"
              onClick={() => setActive((a) => !a)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <ToggleLeft size={16} className={active ? "rotate-180" : ""} />
              {active ? "Active" : "Inactive"}
            </button>
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, PoundSterling, UserPlus, Briefcase } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { addEmployee } from "@/lib/supabase/mutations";
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS } from "@/lib/employee-roles";
import type { EmployeeRole } from "@/lib/types";

export function AddEmployeeButton() {
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addEmployee({
      fullName: String(formData.get("fullName") ?? ""),
      role: String(formData.get("role") ?? "technician") as EmployeeRole,
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      hourlyRate: Number(formData.get("hourlyRate") ?? 0),
      active: true,
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
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New employee
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Employee"
        subtitle="Add a staff member or technician"
        icon={UserPlus}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Full Name" htmlFor="fullName" required>
            <TextInput id="fullName" name="fullName" icon={UserPlus} required placeholder="Jane Smith" />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Role" htmlFor="role" required>
              <Select id="role" name="role" icon={Briefcase} defaultValue="technician" required>
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
                defaultValue="0"
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Email" htmlFor="email">
              <TextInput id="email" name="email" type="email" icon={Mail} placeholder="jane@example.com" />
            </FieldGroup>

            <FieldGroup label="Phone" htmlFor="phone">
              <TextInput id="phone" name="phone" icon={Phone} placeholder="07700 900000" />
            </FieldGroup>
          </div>

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
              {submitting ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

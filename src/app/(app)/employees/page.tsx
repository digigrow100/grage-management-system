import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getEmployees } from "@/lib/supabase/queries";
import { deleteEmployee } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import { AddEmployeeButton } from "@/components/forms/AddEmployeeModal";
import { EditEmployeeButton } from "@/components/forms/EditEmployeeModal";
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_ROLE_TONE } from "@/lib/employee-roles";

export default async function EmployeesPage() {
  await requirePermission("employees.manage");
  const employees = await getEmployees();
  const activeCount = employees.filter((e) => e.active).length;

  return (
    <>
      <TopBar
        title="Employees"
        subtitle={`${employees.length} staff · ${activeCount} active`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddEmployeeButton />
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-900">{emp.fullName}</td>
                    <td className="px-5 py-3">
                      <Badge tone={EMPLOYEE_ROLE_TONE[emp.role]}>
                        {EMPLOYEE_ROLE_LABELS[emp.role]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      <p>{emp.email || "—"}</p>
                      <p className="text-xs text-slate-400">{emp.phone || ""}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatCurrency(emp.hourlyRate)}/hr
                    </td>
                    <td className="px-5 py-3">
                      {emp.active ? (
                        <Badge tone="green">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditEmployeeButton employee={emp} />
                        <DeleteButton
                          id={emp.id}
                          action={deleteEmployee}
                          label={`Delete ${emp.fullName}`}
                          confirmMessage={`Delete ${emp.fullName}? This cannot be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-400">
                      No employees added yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}

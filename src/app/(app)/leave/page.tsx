import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getEmployeeLeave, getEmployees } from "@/lib/supabase/queries";
import { RequestLeaveButton } from "@/components/forms/RequestLeaveModal";
import { LeaveRowActions } from "@/components/leave/LeaveRowActions";
import { formatDate } from "@/lib/format";
import type { LeaveStatus, LeaveType } from "@/lib/types";

const STATUS_TONE: Record<LeaveStatus, "neutral" | "amber" | "green" | "red"> = {
  requested: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "neutral",
};

const TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  other: "Other",
};

export default async function LeavePage() {
  const [leave, employees] = await Promise.all([getEmployeeLeave(), getEmployees()]);
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const pending = leave.filter((l) => l.status === "requested");

  return (
    <>
      <TopBar
        title="Employee Leave"
        subtitle={`${pending.length} request${pending.length === 1 ? "" : "s"} awaiting approval`}
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <RequestLeaveButton employees={employees} />
        </div>

        <Card>
          <CardHeader title="Leave requests" subtitle={`${leave.length} total`} />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Dates</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leave.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {employeeById.get(l.employeeId)?.fullName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{TYPE_LABELS[l.leaveType]}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(l.startsOn)} – {formatDate(l.endsOn)}
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-slate-500">{l.notes ?? ""}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <LeaveRowActions id={l.id} status={l.status} />
                      </td>
                    </tr>
                  ))}
                  {leave.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-400">
                        No leave requests yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </main>
    </>
  );
}

import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getActiveCustomers, getBookingRequests, getEmployees } from "@/lib/supabase/queries";
import { BookingRequestActions } from "@/components/booking-requests/BookingRequestActions";
import { JOB_TYPE_LABELS } from "@/lib/job-types";
import { formatDate } from "@/lib/format";
import type { BookingRequestStatus } from "@/lib/types";

const STATUS_TONE: Record<BookingRequestStatus, "neutral" | "amber" | "green" | "red" | "blue"> = {
  pending: "amber",
  accepted: "green",
  converted: "green",
  declined: "red",
};

export default async function BookingRequestsPage() {
  const [requests, customers, employees] = await Promise.all([
    getBookingRequests(),
    getActiveCustomers(),
    getEmployees(),
  ]);
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <>
      <TopBar
        title="Booking Requests"
        subtitle={`${pending.length} request${pending.length === 1 ? "" : "s"} awaiting review`}
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <Card>
          <CardHeader title="Online booking requests" subtitle={`${requests.length} total`} />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Requested for</th>
                    <th className="px-5 py-3 font-medium">Job type</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 align-top">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{r.customerName}</p>
                        <p className="text-xs text-slate-400">
                          {[r.customerEmail, r.customerPhone].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.vehicleRegistration || [r.vehicleMake, r.vehicleModel].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.preferredDate ? formatDate(r.preferredDate) : "Any time"}
                        {r.preferredTime ? ` · ${r.preferredTime.slice(0, 5)}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="neutral">{JOB_TYPE_LABELS[r.jobType]}</Badge>
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-slate-500">{r.notes ?? ""}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[r.status]} className="capitalize">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <BookingRequestActions request={r} customers={customers} employees={employees} />
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-400">
                        No booking requests yet. Share your booking link from Settings to start receiving
                        them.
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

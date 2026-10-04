import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getBookings,
  getGarageSettings,
  getEmployees,
  getCustomers,
  getInvoices,
  getJobCards,
  getParts,
  getVehicles,
} from "@/lib/supabase/queries";
import { invoicePaymentTotals } from "@/lib/totals";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE } from "@/lib/job-status";
import {
  CalendarClock,
  FileText,
  Wrench,
  Boxes,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { AddCustomerButton } from "@/components/forms/AddCustomerModal";
import { BookJobButton } from "@/components/forms/BookJobModal";
import { workshopToday } from "@/lib/booking-calendar";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const [
    customers,
    vehicles,
    bookings,
    jobCards,
    invoices,
    parts,
    settings,
    employees,
  ] = await Promise.all([
    getCustomers(),
    getVehicles(),
    getBookings(),
    getJobCards(),
    getInvoices(),
    getParts(),
    getGarageSettings(),
    getEmployees(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const TODAY = workshopToday(settings.timezone);

  const todaysBookings = bookings
    .filter((b) => b.date === TODAY)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const openJobs = jobCards.filter(
    (j) =>
      j.status !== "invoiced" &&
      j.status !== "completed" &&
      j.status !== "vehicle_released",
  );

  const outstandingInvoices = invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue",
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + invoicePaymentTotals(inv).balance,
    0,
  );

  const lowStockParts = parts.filter((p) => p.stockLevel <= p.reorderLevel);

  const upcomingMots = vehicles
    .filter((v) => v.motDue)
    .filter((v, idx, arr) => arr.findIndex((y) => y.id === v.id) === idx)
    .filter((v) => daysUntil(v.motDue!) <= 14 && daysUntil(v.motDue!) >= 0)
    .sort((a, b) => daysUntil(a.motDue!) - daysUntil(b.motDue!));

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Overview of today's workshop activity"
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">
            {formatDate(TODAY)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AddCustomerButton />
            <BookJobButton
              customers={customers.filter((customer) => !customer.archived)}
              vehicles={vehicles}
              employees={employees}
              initialDate={TODAY}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Today's bookings"
            value={String(todaysBookings.length)}
            icon={CalendarClock}
            tone="blue"
          />
          <StatCard
            label="Open job cards"
            value={String(openJobs.length)}
            icon={Wrench}
            tone="amber"
          />
          <StatCard
            label="Outstanding invoices"
            value={formatCurrency(outstandingTotal)}
            icon={FileText}
            tone="red"
            hint={`${outstandingInvoices.length} unpaid`}
          />
          <StatCard
            label="Low stock parts"
            value={String(lowStockParts.length)}
            icon={Boxes}
            tone={lowStockParts.length > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Today's bookings"
              icon={CalendarClock}
              subtitle={formatDate(TODAY)}
              action={
                <Link
                  href="/diary"
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  View bookings →
                </Link>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="px-5 py-2 font-medium">Time</th>
                      <th className="px-5 py-2 font-medium">Customer</th>
                      <th className="px-5 py-2 font-medium">Vehicle</th>
                      <th className="px-5 py-2 font-medium">Type</th>
                      <th className="px-5 py-2 font-medium">Bay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysBookings.map((b) => {
                      const customer = customerById.get(b.customerId);
                      const vehicle = b.vehicleId
                        ? vehicleById.get(b.vehicleId)
                        : undefined;
                      return (
                        <tr
                          key={b.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-5 py-3 font-medium text-slate-900">
                            <span className="rounded-lg bg-accent-50 px-2 py-1 font-semibold tabular-nums text-accent-600">
                              {b.time?.slice(0, 5) ?? "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            <Link
                              href={`/customers/${b.customerId}`}
                              className="font-medium text-slate-900 hover:text-accent-600"
                            >
                              {customer?.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {vehicle ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-amber-200 bg-amber-100 px-2 py-1 font-bold tracking-wide text-slate-900">
                                  {vehicle.registration}
                                </span>
                                <span className="text-xs">
                                  {[vehicle.make, vehicle.model]
                                    .filter(Boolean)
                                    .join(" ")}
                                </span>
                              </div>
                            ) : (
                              "No vehicle"
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={JOB_TYPE_TONE[b.jobType]}>
                              {JOB_TYPE_LABELS[b.jobType]}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {b.bay ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {todaysBookings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-6 text-center text-sm text-slate-400"
                        >
                          No bookings scheduled for today.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="MOTs due soon"
              subtitle="Next 14 days"
              icon={TriangleAlert}
            />
            <CardBody className="space-y-3">
              {upcomingMots.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No MOTs due in the next two weeks.
                </p>
              ) : (
                upcomingMots.map((v) => {
                  const customer = customerById.get(v.customerId);
                  const days = daysUntil(v.motDue!);
                  return (
                    <Link
                      href={`/customers/${v.customerId}`}
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {v.registration}
                        </p>
                        <p className="text-xs text-slate-500">
                          {customer?.name}
                        </p>
                      </div>
                      <Badge tone={days <= 3 ? "red" : "amber"}>
                        {days === 0 ? "Due today" : `${days}d left`}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Job board snapshot"
              icon={Wrench}
              subtitle={`${openJobs.length} open jobs`}
              action={
                <Link
                  href="/jobs"
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  View jobs →
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {openJobs.length === 0 ? (
                <p className="text-sm text-slate-400">No open jobs.</p>
              ) : (
                openJobs.map((job) => {
                  const vehicle = job.vehicleId
                    ? vehicleById.get(job.vehicleId)
                    : undefined;
                  return (
                    <Link
                      href={`/jobs/${job.id}`}
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                    >
                      <span className="rounded-md border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-900">
                        {vehicle?.registration ?? "No vehicle"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <Wrench
                            size={15}
                            className="shrink-0 text-slate-400"
                          />
                          {job.description || "Untitled job"}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <UserRound size={13} />
                          {job.technician ?? "Unassigned"}
                        </p>
                      </div>
                      <Badge tone={JOB_STATUS_TONE[job.status]}>
                        {JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Low stock alerts"
              icon={Boxes}
              subtitle="At or below reorder level"
              action={
                <Link
                  href="/inventory"
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  View inventory →
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {lowStockParts.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={30} />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    All parts are above reorder level.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    No low stock alerts at the moment.
                  </p>
                </div>
              ) : (
                lowStockParts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.sku} · {p.supplier}
                      </p>
                    </div>
                    <Badge tone="red">{p.stockLevel} left</Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </>
  );
}

import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getActiveCustomers,
  getBookings,
  getCreditNotes,
  getCustomers,
  getEmployees,
  getGarageSettings,
  getInvoices,
  getJobCards,
  getParts,
  getVehicles,
} from "@/lib/supabase/queries";
import { creditedTotalsByInvoice, netInvoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE } from "@/lib/job-status";
import { AddCustomerButton } from "@/components/forms/AddCustomerModal";
import { BookJobButton } from "@/components/forms/BookJobModal";
import { CalendarClock, Users, Wrench, Boxes, UserPlus, ArrowRight } from "lucide-react";
import Link from "next/link";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const [
    customers,
    activeCustomers,
    vehicles,
    bookings,
    jobCards,
    invoices,
    parts,
    creditNotes,
    employees,
    garage,
  ] = await Promise.all([
    getCustomers(),
    getActiveCustomers(),
    getVehicles(),
    getBookings(),
    getJobCards(),
    getInvoices(),
    getParts(),
    getCreditNotes(),
    getEmployees(),
    getGarageSettings(),
  ]);
  const creditedByInvoice = creditedTotalsByInvoice(creditNotes);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const TODAY = today();

  const todaysBookings = bookings
    .filter((b) => b.date === TODAY)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const openJobs = jobCards.filter(
    (j) =>
      j.status !== "invoiced" &&
      j.status !== "completed" &&
      j.status !== "vehicle_released"
  );

  const outstandingInvoices = invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue"
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + netInvoiceTotals(inv, creditedByInvoice).total,
    0
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddCustomerButton
            employees={employees}
            parts={parts}
            defaultVatRate={garage.defaultVatRate}
            triggerClassName="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-accent-600 to-accent-700 px-5 py-4 text-left text-white shadow-lg shadow-accent-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <UserPlus size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Add Customer</span>
              <span className="block text-xs text-white/80">
                New customer — vehicle, booking &amp; invoice follow
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
          </AddCustomerButton>

          <BookJobButton
            customers={activeCustomers}
            employees={employees}
            parts={parts}
            defaultVatRate={garage.defaultVatRate}
            triggerClassName="group flex items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 to-violet-700 px-5 py-4 text-left text-white shadow-lg shadow-violet-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <CalendarClock size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Add New Booking</span>
              <span className="block text-xs text-white/80">
                Already a customer? Book them in directly
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
          </BookJobButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            icon={Users}
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
              subtitle={formatDate(TODAY)}
              action={
                <Link
                  href="/diary"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
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
                          {b.time ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {customer?.name}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {vehicle
                            ? `${vehicle.registration} · ${vehicle.make ?? ""} ${vehicle.model ?? ""}`
                            : "—"}
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
            <CardHeader title="MOTs due soon" subtitle="Next 14 days" />
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
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
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
                    </div>
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
              subtitle={`${openJobs.length} jobs in progress`}
              action={
                <Link
                  href="/jobs"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
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
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {vehicle?.registration ?? "No vehicle"} — {job.description}
                        </p>
                        <p className="text-xs text-slate-500">
                          {job.technician ?? "Unassigned"}
                        </p>
                      </div>
                      <Badge tone={JOB_STATUS_TONE[job.status]}>
                        {JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Low stock alerts"
              subtitle="At or below reorder level"
              action={
                <Link
                  href="/inventory"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  View inventory →
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {lowStockParts.length === 0 ? (
                <p className="text-sm text-slate-400">
                  All parts are above reorder level.
                </p>
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

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  getBookings,
  getCustomers,
  getEmployees,
  getInvoices,
  getJobCards,
  getParts,
} from "@/lib/supabase/queries";
import { invoiceTotals, jobLineTotal } from "@/lib/totals";
import { formatCurrency } from "@/lib/format";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/job-status";
import { JOB_TYPE_LABELS } from "@/lib/job-types";
import { cn } from "@/lib/cn";
import {
  PoundSterling,
  TrendingUp,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  Package,
} from "lucide-react";
import type { JobCard, JobType } from "@/lib/types";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function lastSixMonths(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[d.getMonth()],
    });
  }
  return months;
}

type RangeKey = "7d" | "30d" | "90d" | "month" | "year" | "all";

const RANGE_TABS: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeStart(range: RangeKey): string | null {
  const now = new Date();
  switch (range) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return isoDate(d);
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return isoDate(d);
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return isoDate(d);
    }
    case "month":
      return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    case "year":
      return isoDate(new Date(now.getFullYear(), 0, 1));
    case "all":
      return null;
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: RangeKey = RANGE_TABS.some((t) => t.value === rangeParam)
    ? (rangeParam as RangeKey)
    : "30d";
  const from = rangeStart(range);

  const [invoices, jobCards, parts, customers, bookings, employees] = await Promise.all([
    getInvoices(),
    getJobCards(),
    getParts(),
    getCustomers(),
    getBookings(),
    getEmployees(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const bookingJobTypeById = new Map(bookings.map((b) => [b.id, b.jobType]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const invoicesInRange = from ? invoices.filter((inv) => inv.date >= from) : invoices;
  const jobsInRange = from ? jobCards.filter((j) => j.createdAt >= from) : jobCards;

  const totalRevenue = invoicesInRange
    .filter((i) => i.status === "paid")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);

  const outstanding = invoicesInRange
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);

  // Cancelled jobs never billed anything (their lines were entered before
  // cancellation), so they're excluded from every revenue/usage aggregate
  // below — same reasoning as the completion-rate exclusion.
  const billableJobs = jobsInRange.filter((j) => j.status !== "cancelled");

  const avgJobValue =
    billableJobs.length > 0
      ? billableJobs.reduce((sum, j) => sum + jobLineTotal(j).total, 0) / billableJobs.length
      : 0;

  const inventoryValue = parts.reduce((sum, p) => sum + p.stockLevel * p.costPrice, 0);

  // Completion rate: cancelled jobs are out-of-scope, not a failure of
  // workshop throughput, so they're excluded from the denominator.
  const completedJobs = billableJobs.filter(
    (j) => j.status === "completed" || j.status === "vehicle_released"
  );
  const completionRate =
    billableJobs.length > 0 ? (completedJobs.length / billableJobs.length) * 100 : null;

  // Labour vs parts revenue split across jobs in range.
  const labourTotal = billableJobs.reduce((sum, j) => sum + jobLineTotal(j).labour, 0);
  const partsRevenueTotal = billableJobs.reduce((sum, j) => sum + jobLineTotal(j).partsTotal, 0);
  const labourPartsTotal = labourTotal + partsRevenueTotal;

  const months = lastSixMonths();
  const monthlyRevenue = months.map(({ key, label }) => {
    const value = invoices
      .filter((inv) => inv.status === "paid" && inv.date.startsWith(key))
      .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);
    return { month: label, value };
  });
  const maxRevenue = Math.max(1, ...monthlyRevenue.map((m) => m.value));
  const hasRevenue = monthlyRevenue.some((m) => m.value > 0);

  const jobsByStatus = JOB_STATUSES.map((status) => ({
    status,
    count: jobsInRange.filter((j) => j.status === status).length,
  }));
  const maxJobs = Math.max(...jobsByStatus.map((j) => j.count), 1);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const revenueForMonth = (key: string) =>
    invoices
      .filter((inv) => inv.status === "paid" && inv.date.startsWith(key))
      .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);
  const thisMonthRevenue = revenueForMonth(thisMonthKey);
  const lastMonthRevenue = revenueForMonth(lastMonthKey);
  const momHint =
    lastMonthRevenue === 0
      ? thisMonthRevenue > 0
        ? "New revenue this month"
        : "No revenue recorded yet"
      : (() => {
          const momChange = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
          return `${momChange >= 0 ? "+" : ""}${momChange.toFixed(0)}% vs last month`;
        })();

  // Top customers by billed total (paid + sent + overdue), within range.
  const revenueByCustomer = new Map<string, number>();
  for (const inv of invoicesInRange) {
    if (inv.status === "estimate" || inv.status === "draft") continue;
    const total = invoiceTotals(inv).total;
    revenueByCustomer.set(inv.customerId, (revenueByCustomer.get(inv.customerId) ?? 0) + total);
  }
  const topCustomers = [...revenueByCustomer.entries()]
    .map(([customerId, total]) => ({
      customerId,
      name: customerById.get(customerId)?.name ?? "Unknown customer",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxCustomerRevenue = Math.max(1, ...topCustomers.map((c) => c.total));

  // Top parts by usage, within range.
  const partUsage = new Map<string, { description: string; quantity: number; revenue: number }>();
  for (const job of billableJobs) {
    for (const line of job.partLines) {
      const key = line.partId ?? `adhoc:${line.description}`;
      const existing = partUsage.get(key) ?? { description: line.description, quantity: 0, revenue: 0 };
      existing.quantity += line.quantity;
      existing.revenue += line.quantity * line.unitPrice;
      partUsage.set(key, existing);
    }
  }
  const topParts = [...partUsage.entries()]
    .map(([key, usage]) => ({ key, ...usage }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const maxPartQuantity = Math.max(1, ...topParts.map((p) => p.quantity));

  // Top services: resolved via the job's originating booking's job type,
  // since job_cards don't carry a service/type field of their own.
  const serviceUsage = new Map<string, { count: number; revenue: number }>();
  for (const job of billableJobs) {
    const jobType: JobType | "other" =
      (job.bookingId && bookingJobTypeById.get(job.bookingId)) || "other";
    const existing = serviceUsage.get(jobType) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += jobLineTotal(job).total;
    serviceUsage.set(jobType, existing);
  }
  const topServices = [...serviceUsage.entries()]
    .map(([jobType, usage]) => ({ jobType: jobType as JobType, ...usage }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxServiceCount = Math.max(1, ...topServices.map((s) => s.count));

  // Technician performance: job-level employeeId assignment only (labour
  // lines aren't individually attributed to a technician).
  const technicianStats = new Map<
    string,
    { jobs: JobCard[]; completed: number; revenue: number }
  >();
  for (const job of billableJobs) {
    if (!job.employeeId) continue;
    const existing = technicianStats.get(job.employeeId) ?? { jobs: [], completed: 0, revenue: 0 };
    existing.jobs.push(job);
    if (job.status === "completed" || job.status === "vehicle_released") existing.completed += 1;
    existing.revenue += jobLineTotal(job).labour;
    technicianStats.set(job.employeeId, existing);
  }
  const technicianRows = [...technicianStats.entries()]
    .map(([employeeId, stats]) => ({
      employeeId,
      name: employeeById.get(employeeId)?.fullName ?? "Unassigned",
      jobCount: stats.jobs.length,
      completed: stats.completed,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  function buildHref(next: RangeKey) {
    return next === "30d" ? "/reports" : `/reports?range=${next}`;
  }

  return (
    <>
      <TopBar title="Reports" subtitle="Sales, revenue and KPI overview" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_TABS.map((t) => (
            <Link
              key={t.value}
              href={buildHref(t.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                range === t.value
                  ? "bg-accent-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue (paid)"
            value={formatCurrency(totalRevenue)}
            icon={PoundSterling}
            tone="green"
            hint={momHint}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            icon={AlertTriangle}
            tone="amber"
          />
          <StatCard
            label="Avg. job value"
            value={formatCurrency(avgJobValue)}
            icon={Wrench}
            tone="blue"
          />
          <StatCard
            label="Inventory value"
            value={formatCurrency(inventoryValue)}
            icon={TrendingUp}
            tone="neutral"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Completion rate"
            value={completionRate === null ? "—" : `${completionRate.toFixed(0)}%`}
            icon={CheckCircle2}
            tone="green"
            hint={`${completedJobs.length} of ${billableJobs.length} jobs (excl. cancelled)`}
          />
          <StatCard
            label="Labour revenue"
            value={formatCurrency(labourTotal)}
            icon={Scissors}
            tone="blue"
            hint={
              labourPartsTotal > 0
                ? `${Math.round((labourTotal / labourPartsTotal) * 100)}% of job revenue`
                : undefined
            }
          />
          <StatCard
            label="Parts revenue"
            value={formatCurrency(partsRevenueTotal)}
            icon={Package}
            tone="amber"
            hint={
              labourPartsTotal > 0
                ? `${Math.round((partsRevenueTotal / labourPartsTotal) * 100)}% of job revenue`
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Monthly revenue" subtitle="Last 6 months, paid invoices" />
            <CardBody>
              {hasRevenue ? (
                <div className="flex h-48 items-end gap-4">
                  {monthlyRevenue.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {formatCurrency(m.value)}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-accent-600 to-accent-500"
                        style={{
                          height: `${(m.value / maxRevenue) * 140}px`,
                        }}
                      />
                      <span className="text-xs text-slate-400">{m.month}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-slate-400">
                  No paid invoices yet — revenue will appear here once invoices are marked paid.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Jobs by status" subtitle="Within selected range" />
            <CardBody className="space-y-3">
              {jobsByStatus.map((j) => (
                <div key={j.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{JOB_STATUS_LABELS[j.status]}</span>
                    <span className="text-slate-400">{j.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-accent-500"
                      style={{ width: `${(j.count / maxJobs) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Top services" subtitle="By job count, within selected range" />
            <CardBody className="space-y-3">
              {topServices.length === 0 ? (
                <p className="text-sm text-slate-400">No jobs in this range yet.</p>
              ) : (
                topServices.map((s) => (
                  <div key={s.jobType}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {s.jobType === "other" ? "Other / no booking" : JOB_TYPE_LABELS[s.jobType]}
                      </span>
                      <span className="text-slate-400">
                        {s.count} job{s.count === 1 ? "" : "s"} · {formatCurrency(s.revenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-violet-500"
                        style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Technician performance" subtitle="By labour revenue, within selected range" />
            <CardBody className="p-0">
              {technicianRows.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">
                  No jobs with an assigned technician in this range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                        <th className="px-5 py-2 font-medium">Technician</th>
                        <th className="px-5 py-2 font-medium">Jobs</th>
                        <th className="px-5 py-2 font-medium">Completed</th>
                        <th className="px-5 py-2 text-right font-medium">Labour revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technicianRows.map((t) => (
                        <tr key={t.employeeId} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-2.5 text-slate-900">{t.name}</td>
                          <td className="px-5 py-2.5 text-slate-500">{t.jobCount}</td>
                          <td className="px-5 py-2.5 text-slate-500">{t.completed}</td>
                          <td className="px-5 py-2.5 text-right font-medium text-slate-900">
                            {formatCurrency(t.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Top customers" subtitle="By billed total, within selected range" />
            <CardBody className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-400">No billed invoices in this range.</p>
              ) : (
                topCustomers.map((c) => (
                  <div key={c.customerId}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">{c.name}</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${(c.total / maxCustomerRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Top parts" subtitle="By quantity used, within selected range" />
            <CardBody className="space-y-3">
              {topParts.length === 0 ? (
                <p className="text-sm text-slate-400">No parts allocated to jobs in this range.</p>
              ) : (
                topParts.map((p) => (
                  <div key={p.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">{p.description}</span>
                      <span className="text-slate-400">
                        {p.quantity} used · {formatCurrency(p.revenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{ width: `${(p.quantity / maxPartQuantity) * 100}%` }}
                      />
                    </div>
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

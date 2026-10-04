import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getCustomers, getInvoices, getJobCards, getParts } from "@/lib/supabase/queries";
import { invoiceTotals, jobLineTotal } from "@/lib/totals";
import { formatCurrency } from "@/lib/format";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/job-status";
import { PoundSterling, TrendingUp, Wrench, AlertTriangle } from "lucide-react";

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

export default async function ReportsPage() {
  await requirePermission("reports.view");
  const [invoices, jobCards, parts, customers] = await Promise.all([
    getInvoices(),
    getJobCards(),
    getParts(),
    getCustomers(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);

  const avgJobValue =
    jobCards.length > 0
      ? jobCards.reduce((sum, j) => sum + jobLineTotal(j).total, 0) / jobCards.length
      : 0;

  const inventoryValue = parts.reduce(
    (sum, p) => sum + p.stockLevel * p.costPrice,
    0
  );

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
    count: jobCards.filter((j) => j.status === status).length,
  }));
  const maxJobs = Math.max(...jobsByStatus.map((j) => j.count), 1);

  // Month-over-month revenue change, paid invoices only.
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
          const momChange =
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
          return `${momChange >= 0 ? "+" : ""}${momChange.toFixed(0)}% vs last month`;
        })();

  // Top customers by billed total (paid + sent + overdue).
  const revenueByCustomer = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === "estimate" || inv.status === "draft") continue;
    const total = invoiceTotals(inv).total;
    revenueByCustomer.set(
      inv.customerId,
      (revenueByCustomer.get(inv.customerId) ?? 0) + total
    );
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

  // Top parts by usage across all job cards, grouped by part identity (not
  // description, since two distinct parts can share a name).
  const partUsage = new Map<string, { description: string; quantity: number; revenue: number }>();
  for (const job of jobCards) {
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

  return (
    <>
      <TopBar
        title="Reports"
        subtitle="Sales, revenue and KPI overview"
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
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
                      <span className="text-xs text-slate-400">
                        {m.month}
                      </span>
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
            <CardHeader title="Jobs by status" subtitle="Current workshop load" />
            <CardBody className="space-y-3">
              {jobsByStatus.map((j) => (
                <div key={j.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      {JOB_STATUS_LABELS[j.status]}
                    </span>
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
            <CardHeader title="Top customers" subtitle="By billed total (sent, paid, overdue)" />
            <CardBody className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No billed invoices yet.
                </p>
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
            <CardHeader title="Top parts" subtitle="By quantity used across all jobs" />
            <CardBody className="space-y-3">
              {topParts.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No parts have been allocated to jobs yet.
                </p>
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

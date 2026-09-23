import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { getBookings, getCustomers, getInvoices } from "@/lib/supabase/queries";
import { invoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { Users, PoundSterling, UserCheck, UserX } from "lucide-react";

type SegmentTone = "green" | "blue" | "amber" | "red" | "neutral";

function segmentFor(daysSinceLastVisit: number | null): { label: string; tone: SegmentTone } {
  if (daysSinceLastVisit === null) return { label: "New", tone: "blue" };
  if (daysSinceLastVisit <= 60) return { label: "Active", tone: "green" };
  if (daysSinceLastVisit <= 180) return { label: "Lapsing", tone: "amber" };
  return { label: "At risk", tone: "red" };
}

export default async function CustomerIntelligencePage() {
  const [customers, bookings, invoices] = await Promise.all([
    getCustomers(),
    getBookings(),
    getInvoices(),
  ]);

  // Only count visits that have actually happened, so a future booking can't
  // masquerade as the customer's most recent (and put them in "Active").
  // Cancelled/no-show bookings never happened either, so they're excluded
  // the same way — a no-show shouldn't count as a visit.
  const today = new Date().toISOString().slice(0, 10);
  const bookingsByCustomer = new Map<string, string[]>();
  for (const b of bookings) {
    if (b.date > today) continue;
    if (b.status === "cancelled" || b.status === "no_show") continue;
    const list = bookingsByCustomer.get(b.customerId) ?? [];
    list.push(b.date);
    bookingsByCustomer.set(b.customerId, list);
  }

  // Lifetime spend reflects money actually collected, not billed-but-unpaid.
  const spendByCustomer = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const total = invoiceTotals(inv).total;
    spendByCustomer.set(inv.customerId, (spendByCustomer.get(inv.customerId) ?? 0) + total);
  }

  const rows = customers
    .map((c) => {
      const visits = bookingsByCustomer.get(c.id) ?? [];
      const lastVisit = visits.length > 0 ? visits.sort().at(-1)! : null;
      const daysSinceLastVisit = lastVisit ? -daysUntil(lastVisit) : null;
      const totalSpend = spendByCustomer.get(c.id) ?? 0;
      const segment = segmentFor(daysSinceLastVisit);
      return {
        customer: c,
        visitCount: visits.length,
        lastVisit,
        daysSinceLastVisit,
        totalSpend,
        segment,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const totalLifetimeSpend = rows.reduce((sum, r) => sum + r.totalSpend, 0);
  const activeCount = rows.filter((r) => r.segment.label === "Active").length;
  const atRiskCount = rows.filter((r) => r.segment.label === "At risk").length;
  const avgSpendPerCustomer = rows.length > 0 ? totalLifetimeSpend / rows.length : 0;

  return (
    <>
      <TopBar title="Customer Intelligence" subtitle="Spend, visit frequency, and retention risk" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total customers"
            value={String(customers.length)}
            icon={Users}
            tone="blue"
          />
          <StatCard
            label="Avg. spend / customer"
            value={formatCurrency(avgSpendPerCustomer)}
            icon={PoundSterling}
            tone="green"
          />
          <StatCard
            label="Active (visited ≤60d)"
            value={String(activeCount)}
            icon={UserCheck}
            tone="green"
          />
          <StatCard
            label="At risk (180d+)"
            value={String(atRiskCount)}
            icon={UserX}
            tone="red"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Segment</th>
                  <th className="px-5 py-3 font-medium">Visits</th>
                  <th className="px-5 py-3 font-medium">Last visit</th>
                  <th className="px-5 py-3 text-right font-medium">Lifetime spend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.customer.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{r.customer.name}</p>
                      <p className="text-xs text-slate-500">{r.customer.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={r.segment.tone}>{r.segment.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{r.visitCount}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {r.lastVisit ? formatDate(r.lastVisit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(r.totalSpend)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-400">
                      No customers yet.
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

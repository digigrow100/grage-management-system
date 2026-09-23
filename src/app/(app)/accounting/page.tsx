import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getInvoices, getJobCards, getParts } from "@/lib/supabase/queries";
import { invoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { PoundSterling, Receipt, TrendingDown, TrendingUp } from "lucide-react";

export default async function AccountingPage() {
  const [invoices, jobCards, parts] = await Promise.all([
    getInvoices(),
    getJobCards(),
    getParts(),
  ]);

  const partById = new Map(parts.map((p) => [p.id, p]));

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const revenue = paidInvoices.reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);
  const vatCollected = paidInvoices.reduce((sum, inv) => sum + invoiceTotals(inv).vat, 0);
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);

  // Cost of parts used, restricted to jobs whose linked invoice is paid —
  // matching costs to the same revenue being recognized above. Parts on
  // jobs that aren't invoiced (or invoiced but unpaid) don't reduce margin
  // yet, since that revenue isn't counted either.
  const paidJobIds = new Set(paidInvoices.flatMap((inv) => inv.jobIds));
  const costOfPartsUsed = jobCards
    .filter((job) => paidJobIds.has(job.id))
    .reduce((sum, job) => {
      return (
        sum +
        job.partLines.reduce((lineSum, line) => {
          const cost = line.partId ? partById.get(line.partId)?.costPrice ?? 0 : 0;
          return lineSum + cost * line.quantity;
        }, 0)
      );
    }, 0);

  const grossProfit = revenue - costOfPartsUsed;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const recentPaid = [...paidInvoices]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <>
      <TopBar title="Accounting" subtitle="Revenue, VAT, and gross margin overview" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue (paid)"
            value={formatCurrency(revenue)}
            icon={PoundSterling}
            tone="green"
          />
          <StatCard
            label="VAT collected"
            value={formatCurrency(vatCollected)}
            icon={Receipt}
            tone="blue"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            icon={TrendingDown}
            tone="amber"
          />
          <StatCard
            label="Gross profit"
            value={formatCurrency(grossProfit)}
            icon={TrendingUp}
            tone="green"
            hint={`${grossMargin.toFixed(0)}% margin`}
          />
        </div>

        <Card>
          <CardHeader title="Cost of parts used" subtitle="Jobs linked to paid invoices only" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Revenue (paid)</span>
              <span className="font-medium">{formatCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cost of parts used</span>
              <span className="font-medium text-rose-600">-{formatCurrency(costOfPartsUsed)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
              <span>Gross profit</span>
              <span>{formatCurrency(grossProfit)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent paid invoices" />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-2 font-medium">Number</th>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">VAT</th>
                    <th className="px-5 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPaid.map((inv) => {
                    const { vat, total } = invoiceTotals(inv);
                    return (
                      <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-slate-900">{inv.number}</td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="px-5 py-3 text-slate-500">{formatCurrency(vat)}</td>
                        <td className="px-5 py-3 text-right font-medium">{formatCurrency(total)}</td>
                      </tr>
                    );
                  })}
                  {recentPaid.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-400">
                        No paid invoices yet.
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

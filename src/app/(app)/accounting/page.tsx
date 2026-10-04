import { requirePermission } from "@/lib/supabase/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarageId } from "@/lib/supabase/garage";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ExpenseButton } from "@/components/workflows/WorkflowForms";
import { getInvoices, getJobCards } from "@/lib/supabase/queries";
import { accountingTotals } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { PoundSterling, Receipt, TrendingDown, TrendingUp } from "lucide-react";
export default async function AccountingPage() {
  await requirePermission("accounting.manage");
  const supabase = await createClient(),
    garage = await getCurrentGarageId();
  const [invoices, jobs, result] = await Promise.all([
    getInvoices(),
    getJobCards(),
    supabase
      .from("garage_expenses")
      .select("*")
      .eq("garage_id", garage)
      .order("spent_on", { ascending: false }),
  ]);
  if (result.error) throw new Error("Could not load expenses.");
  const expenses = result.data ?? [],
    t = accountingTotals(
      invoices,
      jobs,
      expenses.reduce((s, e) => s + e.amount, 0),
    );
  return (
    <>
      <TopBar title="Accounting" subtitle="Cash-basis profit, excluding VAT" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <ExpenseButton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue excluding VAT"
            value={formatCurrency(t.revenue)}
            icon={PoundSterling}
            tone="green"
          />
          <StatCard
            label="VAT collected"
            value={formatCurrency(t.vat)}
            icon={Receipt}
            tone="blue"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(t.outstanding)}
            icon={TrendingDown}
            tone="amber"
          />
          <StatCard
            label="Net profit"
            value={formatCurrency(t.netProfit)}
            icon={TrendingUp}
            tone="green"
          />
        </div>
        <Card>
          <CardHeader
            title="Profit calculation"
            subtitle="Part costs are captured when used. Partial payments recognise the same share of revenue and part costs."
          />
          <CardBody className="space-y-3 text-sm">
            {[
              ["Revenue excluding VAT", t.revenue],
              ["Parts cost", -t.partsCost],
              ["Gross profit", t.grossProfit],
              ["Operating expenses", -t.expenses],
              ["Net profit", t.netProfit],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <span>{label}</span>
                <strong>{formatCurrency(Number(value))}</strong>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Historical jobs use the part cost available when payment tracking
              was introduced. Unlinked manual invoices have no recorded job-part
              cost.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Operating expenses"
            subtitle="Amounts excluding recoverable VAT"
          />
          <CardBody>
            {expenses.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2">Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="py-3">{formatDate(e.spent_on)}</td>
                        <td>{e.description}</td>
                        <td>{e.category}</td>
                        <td className="text-right">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No expenses recorded.</p>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

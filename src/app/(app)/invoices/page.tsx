import { requirePermission } from "@/lib/supabase/permissions";
import Link from "next/link";
import { InvoiceRow } from "@/components/invoices/InvoiceRow";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/StatCard";
import { FileText, ClipboardList, Wallet, Clock3 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  getActiveCustomers,
  getCustomers,
  getGarageSettings,
  getInvoices,
  getVehicles,
} from "@/lib/supabase/queries";
import { deleteInvoice } from "@/lib/supabase/mutations";
import { invoiceTotals, invoicePaymentTotals } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreateInvoiceButton } from "@/components/forms/CreateInvoiceModal";

const statusTone: Record<
  string,
  "neutral" | "blue" | "green" | "red" | "purple"
> = {
  estimate: "purple",
  draft: "neutral",
  sent: "blue",
  paid: "green",
  overdue: "red",
};

export default async function InvoicesPage() {
  await requirePermission("invoices.manage", "invoices.view");
  const [invoices, customers, activeCustomers, vehicles, garage] =
    await Promise.all([
      getInvoices(),
      getCustomers(),
      getActiveCustomers(),
      getVehicles(),
      getGarageSettings(),
    ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const issuedInvoices = invoices.filter(
    (invoice) => invoice.status !== "estimate",
  );
  const estimates = invoices.filter((invoice) => invoice.status === "estimate");
  const paymentSummary = issuedInvoices.reduce(
    (summary, invoice) => {
      const { received, balance } = invoicePaymentTotals(invoice);
      return {
        received: summary.received + received,
        balance: summary.balance + balance,
      };
    },
    { received: 0, balance: 0 },
  );

  return (
    <>
      <TopBar
        title="Estimates & Invoicing"
        subtitle={`${invoices.length} invoices`}
      />
      <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Manage estimates, invoices, and payments.
          </p>
          <div className="flex flex-wrap gap-2">
            <CreateInvoiceButton
              customers={activeCustomers}
              vehicles={vehicles}
              mode="estimate"
              defaultVatRate={garage.defaultVatRate}
            />
            <CreateInvoiceButton
              customers={activeCustomers}
              vehicles={vehicles}
              defaultVatRate={garage.defaultVatRate}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Invoices"
            value={String(issuedInvoices.length)}
            icon={FileText}
            tone="blue"
          />
          <StatCard
            label="Estimates"
            value={String(estimates.length)}
            icon={ClipboardList}
            tone="amber"
          />
          <StatCard
            label="Payments received"
            value={formatCurrency(paymentSummary.received)}
            icon={Wallet}
            tone="green"
          />
          <StatCard
            label="Remaining balance"
            value={formatCurrency(paymentSummary.balance)}
            icon={Clock3}
            tone="red"
            hint="Includes drafts · excludes estimates"
          />
        </div>
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader
            title="Invoice register"
            subtitle={`${issuedInvoices.length} invoices · ${estimates.length} estimates`}
            icon={FileText}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Received</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Remaining
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const customer = customerById.get(inv.customerId);
                  const vehicle = inv.vehicleId
                    ? vehicleById.get(inv.vehicleId)
                    : undefined;
                  const { total } = invoiceTotals(inv);
                  const { received, balance } = invoicePaymentTotals(inv);
                  return (
                    <InvoiceRow key={inv.id} id={inv.id} number={inv.number}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="flex items-center gap-2 font-semibold text-slate-900 hover:text-accent-600"
                        >
                          <span className="rounded-lg bg-accent-50 p-2 text-accent-600">
                            <FileText size={16} aria-hidden="true" />
                          </span>
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {customer?.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {vehicle ? (
                          <span className="whitespace-nowrap rounded-md border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-900">
                            {vehicle.registration}
                          </span>
                        ) : (
                          "No vehicle"
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(inv.date)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={statusTone[inv.status]}
                          className="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-700">
                        {formatCurrency(received)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DeleteButton
                          allowed={
                            inv.status !== "paid" && inv.payments.length === 0
                          }
                          id={inv.id}
                          action={deleteInvoice}
                          label={`Delete ${inv.number}`}
                          confirmMessage={`Delete invoice ${inv.number}? This cannot be undone.`}
                        />
                      </td>
                    </InvoiceRow>
                  );
                })}
                {invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-6 text-center text-sm text-slate-400"
                    >
                      No invoices yet. Click &ldquo;New invoice&rdquo; to create
                      one.
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

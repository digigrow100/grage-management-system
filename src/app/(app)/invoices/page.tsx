import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  getActiveCustomers,
  getCustomers,
  getGarageSettings,
  getInvoices,
  getJobCards,
  getVehicles,
} from "@/lib/supabase/queries";
import { deleteInvoice } from "@/lib/supabase/mutations";
import { invoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreateInvoiceButton } from "@/components/forms/CreateInvoiceModal";

const statusTone: Record<string, "neutral" | "blue" | "green" | "red" | "purple"> = {
  estimate: "purple",
  draft: "neutral",
  sent: "blue",
  paid: "green",
  overdue: "red",
};

export default async function InvoicesPage() {
  const [invoices, customers, activeCustomers, vehicles, garage, jobs] = await Promise.all([
    getInvoices(),
    getCustomers(),
    getActiveCustomers(),
    getVehicles(),
    getGarageSettings(),
    getJobCards(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <>
      <TopBar
        title="Estimates & Invoicing"
        subtitle={`${invoices.length} invoices`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end gap-2">
          <CreateInvoiceButton
            customers={activeCustomers}
            vehicles={vehicles}
            mode="estimate"
            defaultVatRate={garage.defaultVatRate}
          />
          <CreateInvoiceButton
            customers={activeCustomers}
            vehicles={vehicles}
            jobs={jobs}
            defaultVatRate={garage.defaultVatRate}
          />
        </div>
        <Card>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
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
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {customer?.name}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {vehicle?.registration ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone[inv.status]} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteButton
                        id={inv.id}
                        action={deleteInvoice}
                        label={`Delete ${inv.number}`}
                        confirmMessage={`Delete invoice ${inv.number}? This cannot be undone.`}
                      />
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-slate-400">
                    No invoices yet. Click &ldquo;New invoice&rdquo; to create one.
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

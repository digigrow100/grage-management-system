import { TopBar } from "@/components/layout/TopBar";
import {
  getActiveCustomers,
  getCustomers,
  getGarageSettings,
  getInvoices,
  getJobCards,
  getVehicles,
} from "@/lib/supabase/queries";
import { CreateInvoiceButton } from "@/components/forms/CreateInvoiceModal";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";

export default async function InvoicesPage() {
  const [invoices, customers, activeCustomers, vehicles, garage, jobs] = await Promise.all([
    getInvoices(),
    getCustomers(),
    getActiveCustomers(),
    getVehicles(),
    getGarageSettings(),
    getJobCards(),
  ]);

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
        <InvoicesTable invoices={invoices} customers={customers} vehicles={vehicles} />
      </main>
    </>
  );
}

import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import {
  getCreditNotesForInvoice,
  getCustomer,
  getCustomers,
  getGarageSettings,
  getInvoice,
  getVehicle,
  getVehicles,
} from "@/lib/supabase/queries";
import { invoiceTotals } from "@/lib/totals";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import { CreditNotesList } from "@/components/invoices/CreditNotesList";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const [customer, vehicle, customers, vehicles, garage, creditNotes] = await Promise.all([
    getCustomer(invoice.customerId),
    invoice.vehicleId ? getVehicle(invoice.vehicleId) : Promise.resolve(undefined),
    getCustomers(),
    getVehicles(),
    getGarageSettings(),
    getCreditNotesForInvoice(invoice.id),
  ]);
  const totals = invoiceTotals(invoice);

  return (
    <>
      <TopBar title={invoice.number} subtitle="Invoice detail — A4" />
      <main className="flex-1 space-y-4 overflow-y-auto bg-slate-100 p-4 sm:p-6">
        <InvoiceView
          invoice={invoice}
          customer={customer}
          vehicle={vehicle}
          totals={totals}
          customers={customers}
          vehicles={vehicles}
          garage={garage}
        />
        <div className="mx-auto max-w-3xl">
          <CreditNotesList creditNotes={creditNotes} invoiceId={invoice.id} />
        </div>
      </main>
    </>
  );
}

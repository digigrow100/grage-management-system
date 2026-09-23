import type { CreditNote, Invoice, JobCard } from "./types";

export function invoiceTotals(invoice: Invoice) {
  const subtotal = invoice.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0
  );
  const vat = subtotal * (invoice.vatRate / 100);
  return { subtotal, vat, total: subtotal + vat };
}

export function creditNoteTotals(creditNote: CreditNote) {
  const subtotal = creditNote.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0
  );
  const vat = subtotal * (creditNote.vatRate / 100);
  return { subtotal, vat, total: subtotal + vat };
}

/**
 * Sums *issued* credit notes (draft/void ones haven't actually refunded
 * anything) per invoice, so revenue aggregates can net a refund out of the
 * invoice it was issued against.
 */
export function creditedTotalsByInvoice(
  creditNotes: CreditNote[]
): Map<string, { subtotal: number; vat: number; total: number }> {
  const map = new Map<string, { subtotal: number; vat: number; total: number }>();
  for (const cn of creditNotes) {
    if (cn.status !== "issued") continue;
    const t = creditNoteTotals(cn);
    const existing = map.get(cn.invoiceId) ?? { subtotal: 0, vat: 0, total: 0 };
    existing.subtotal += t.subtotal;
    existing.vat += t.vat;
    existing.total += t.total;
    map.set(cn.invoiceId, existing);
  }
  return map;
}

/** invoiceTotals() minus any issued credit notes against that invoice. */
export function netInvoiceTotals(
  invoice: Invoice,
  creditedByInvoice: Map<string, { subtotal: number; vat: number; total: number }>
) {
  const gross = invoiceTotals(invoice);
  const credited = creditedByInvoice.get(invoice.id);
  if (!credited) return gross;
  return {
    subtotal: gross.subtotal - credited.subtotal,
    vat: gross.vat - credited.vat,
    total: gross.total - credited.total,
  };
}

export function jobLineTotal(job: JobCard) {
  const labour = job.labourLines.reduce((sum, l) => sum + l.hours * l.rate, 0);
  const partsTotal = job.partLines.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0
  );
  return { labour, partsTotal, total: labour + partsTotal };
}

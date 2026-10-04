import type { Invoice, JobCard } from "./types";

export function invoiceTotals(invoice: Invoice) {
  const rawSubtotal = invoice.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0,
  );
  const subtotal = Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;
  const total =
    Math.round(
      (rawSubtotal * (1 + invoice.vatRate / 100) + Number.EPSILON) * 100,
    ) / 100;
  const vat = Math.round((total - subtotal) * 100) / 100;
  return { subtotal, vat, total };
}

export function jobLineTotal(job: JobCard) {
  const labour = job.labourLines.reduce((sum, l) => sum + l.hours * l.rate, 0);
  const partsTotal = job.partLines.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0,
  );
  return { labour, partsTotal, total: labour + partsTotal };
}

export function invoicePaymentTotals(invoice: Invoice) {
  const { total } = invoiceTotals(invoice);
  const received = invoice.payments.length
    ? invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    : invoice.status === "paid"
      ? total
      : 0;
  return {
    received,
    balance: Math.max(0, Math.round((total - received) * 100) / 100),
    legacyPaid: invoice.status === "paid" && !invoice.payments.length,
  };
}

/** Cash-basis profit: VAT is excluded and job costs follow the collected share. */
export function accountingTotals(
  invoices: Invoice[],
  jobs: JobCard[],
  expenses: number,
) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  let revenue = 0,
    vat = 0,
    outstanding = 0,
    partsCost = 0;
  for (const invoice of invoices) {
    if (invoice.status === "estimate") continue;
    const totals = invoiceTotals(invoice),
      payment = invoicePaymentTotals(invoice);
    const share =
      totals.total > 0 ? Math.min(1, payment.received / totals.total) : 0;
    revenue += totals.subtotal * share;
    vat += totals.vat * share;
    if (invoice.status !== "draft") outstanding += payment.balance;
    const job = invoice.jobId ? byId.get(invoice.jobId) : undefined;
    if (job)
      partsCost +=
        job.partLines.reduce((s, l) => s + l.costPrice * l.quantity, 0) * share;
  }
  return {
    revenue,
    vat,
    outstanding,
    partsCost,
    grossProfit: revenue - partsCost,
    expenses,
    netProfit: revenue - partsCost - expenses,
  };
}

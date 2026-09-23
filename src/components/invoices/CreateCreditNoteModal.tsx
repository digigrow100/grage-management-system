"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileMinus, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextArea, TextInput } from "@/components/ui/Field";
import { createCreditNote, type CreditNoteLineInput } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/lib/types";

interface DraftLine extends CreditNoteLineInput {
  id: string;
}

let lineSeq = 0;
function newLine(description = "", quantity = 1, unitPrice = 0): DraftLine {
  lineSeq += 1;
  return { id: `draft_${lineSeq}`, description, quantity, unitPrice };
}

export function CreateCreditNoteButton({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const vat = subtotal * (invoice.vatRate / 100);
  const total = subtotal + vat;

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addLine() {
    setLines((rows) => [...rows, newLine()]);
  }

  function removeLine(id: string) {
    setLines((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  function prefillFromInvoice() {
    setLines(invoice.lineItems.map((l) => newLine(l.description, l.quantity, l.unitPrice)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createCreditNote({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      reason,
      vatRate: invoice.vatRate,
      lineItems: lines.map(({ description, quantity, unitPrice }) => ({
        description,
        quantity,
        unitPrice,
      })),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setLines([newLine()]);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
      >
        <FileMinus size={15} /> Issue Credit Note
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Issue Credit Note"
        subtitle={`Against invoice ${invoice.number}`}
        icon={FileMinus}
        maxWidth="max-w-2xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Reason" htmlFor="reason">
            <div className="relative">
              <TextArea
                id="reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this credit note is being issued..."
              />
            </div>
          </FieldGroup>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lines</p>
              <button
                type="button"
                onClick={prefillFromInvoice}
                className="text-xs font-medium text-accent-600 hover:text-accent-700"
              >
                Copy all lines from invoice
              </button>
            </div>
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_100px_auto]">
                <TextInput
                  aria-label="Description"
                  value={line.description}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  placeholder="Description"
                  required
                />
                <TextInput
                  aria-label="Quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                />
                <TextInput
                  aria-label="Unit price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) })}
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove line"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              <Plus size={14} /> Add line
            </button>
          </div>

          <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>VAT ({invoice.vatRate}%)</span>
              <span>{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total credit</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-rose-600/30 transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              {submitting ? "Issuing..." : "Issue Credit Note"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

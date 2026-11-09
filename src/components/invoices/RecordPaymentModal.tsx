"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/format";
import { recordInvoicePayment } from "@/lib/supabase/mutations";

export function RecordPaymentButton({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const result = await recordInvoicePayment(invoiceId, {
        amount: balance,
        date: String(form.get("paymentDate") ?? ""),
        method: String(form.get("paymentMethod") ?? ""),
        reference: String(form.get("paymentReference") ?? ""),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not confirm the payment was recorded. Refresh the invoice before trying again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true); }}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
      >
        Record payment
      </button>
      <Modal open={open} onClose={() => { if (!saving) setOpen(false); }} title="Record payment" icon={Receipt}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Record a payment you have already received for the remaining balance of {formatCurrency(balance)}.
          </p>
          <FieldGroup label="Date received" htmlFor="paymentDate" required>
            <TextInput id="paymentDate" name="paymentDate" type="date" required />
          </FieldGroup>
          <FieldGroup label="Payment method" htmlFor="paymentMethod" required>
            <Select id="paymentMethod" name="paymentMethod" required defaultValue="">
              <option value="" disabled>Select a method</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </Select>
          </FieldGroup>
          <FieldGroup label="Reference" htmlFor="paymentReference">
            <TextInput id="paymentReference" name="paymentReference" maxLength={120} />
          </FieldGroup>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={saving} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Recording..." : "Save payment"}
          </button>
        </form>
      </Modal>
    </>
  );
}

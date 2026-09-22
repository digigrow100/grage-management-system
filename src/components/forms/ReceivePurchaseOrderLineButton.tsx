"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { receivePurchaseOrderLine } from "@/lib/supabase/mutations";

export function ReceivePurchaseOrderLineButton({
  lineId,
  outstanding,
  defaultUnitCost,
}: {
  lineId: string;
  outstanding: number;
  defaultUnitCost: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await receivePurchaseOrderLine(
      lineId,
      Number(formData.get("quantity") ?? 0),
      formData.get("unitCost") ? Number(formData.get("unitCost")) : undefined
    );

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <PackageCheck size={13} /> Receive
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Receive Stock" icon={PackageCheck} maxWidth="max-w-sm">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Quantity received" htmlFor="quantity" required hint={`${outstanding} outstanding`}>
            <TextInput
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              max={outstanding}
              step="1"
              defaultValue={outstanding}
              required
            />
          </FieldGroup>
          <FieldGroup label="Unit cost (£)" htmlFor="unitCost">
            <TextInput id="unitCost" name="unitCost" type="number" min="0" step="0.01" defaultValue={defaultUnitCost} />
          </FieldGroup>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-3">
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
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Receiving..." : "Confirm receipt"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

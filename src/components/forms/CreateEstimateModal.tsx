"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Car, ClipboardList, FileText, Percent, Plus, Trash2, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { createEstimate, type EstimateLineInput } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { Customer, Vehicle } from "@/lib/types";

const DEFAULT_VAT_RATE = 20;

interface DraftLine extends EstimateLineInput {
  id: string;
}

let lineSeq = 0;
function newLine(): DraftLine {
  lineSeq += 1;
  return { id: `draft_${lineSeq}`, lineType: "labour", description: "", quantity: 1, unitPrice: 0 };
}

const LINE_TYPE_LABELS: Record<EstimateLineInput["lineType"], string> = {
  labour: "Labour",
  part: "Part",
  other: "Other",
};

export function CreateEstimateButton({
  customers,
  vehicles,
  defaultVatRate = DEFAULT_VAT_RATE,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  defaultVatRate?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerVehicles = useMemo(
    () => (customerId ? vehicles.filter((v) => v.customerId === customerId) : []),
    [customerId, vehicles]
  );

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((items) => items.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((items) => [...items, newLine()]);
  }

  function removeLine(id: string) {
    setLines((items) => (items.length > 1 ? items.filter((l) => l.id !== id) : items));
  }

  function reset() {
    setCustomerId("");
    setVatRate(defaultVatRate);
    setLines([newLine()]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createEstimate({
      customerId,
      vehicleId: String(formData.get("vehicle") ?? ""),
      issueDate: String(formData.get("issueDate") ?? ""),
      validUntil: String(formData.get("validUntil") ?? ""),
      vatRate,
      notes: String(formData.get("notes") ?? ""),
      lines: lines.map(({ lineType, description, quantity, unitPrice }) => ({
        lineType,
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
    reset();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New estimate
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Estimate"
        subtitle="Quote a customer before the work is confirmed"
        icon={ClipboardList}
        maxWidth="max-w-2xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Customer" htmlFor="customer" required>
              <Select
                id="customer"
                name="customer"
                icon={User}
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup label="Vehicle" htmlFor="vehicle" hint="Optional">
              <Select id="vehicle" name="vehicle" icon={Car} disabled={!customerId} defaultValue="">
                <option value="">
                  {customerId ? "No specific vehicle" : "Select a customer first"}
                </option>
                {customerVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} · {v.make ?? ""} {v.model ?? ""}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Issue Date" htmlFor="issueDate" required>
              <TextInput
                id="issueDate"
                name="issueDate"
                type="date"
                icon={Calendar}
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </FieldGroup>

            <FieldGroup label="Valid Until" htmlFor="validUntil" hint="Optional">
              <TextInput id="validUntil" name="validUntil" type="date" icon={Calendar} />
            </FieldGroup>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Lines</label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
              >
                <Plus size={14} /> Add line
              </button>
            </div>
            <div className="space-y-2.5">
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                >
                  <div className="col-span-4 sm:col-span-2">
                    <Select
                      aria-label="Line type"
                      value={l.lineType}
                      onChange={(e) =>
                        updateLine(l.id, { lineType: e.target.value as EstimateLineInput["lineType"] })
                      }
                    >
                      {Object.entries(LINE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-8 sm:col-span-4">
                    <TextInput
                      aria-label="Description"
                      placeholder="Description"
                      value={l.description}
                      onChange={(e) => updateLine(l.id, { description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <TextInput
                      aria-label="Quantity"
                      type="number"
                      min="0"
                      step="0.5"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <TextInput
                      aria-label="Unit price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      disabled={lines.length === 1}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="VAT Rate (%)" htmlFor="vatRate">
              <TextInput
                id="vatRate"
                name="vatRate"
                type="number"
                icon={Percent}
                min="0"
                max="100"
                step="1"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
              />
            </FieldGroup>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>VAT</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <div className="relative">
              <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <TextArea id="notes" name="notes" rows={3} className="pl-9" placeholder="Terms, validity notes, etc." />
            </div>
          </FieldGroup>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

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
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Estimate"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

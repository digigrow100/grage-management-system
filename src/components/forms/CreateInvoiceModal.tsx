"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  ClipboardList,
  FileText,
  Percent,
  Plus,
  Receipt,
  Trash2,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { addInvoice } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { Customer, Vehicle } from "@/lib/types";

const DEFAULT_VAT_RATE = 20;

interface DraftLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

let lineItemSeq = 0;
function newLineItem(): DraftLineItem {
  lineItemSeq += 1;
  return { id: `draft_${lineItemSeq}`, description: "", quantity: 1, unitPrice: 0 };
}

export function CreateInvoiceButton({
  customers,
  vehicles,
  mode = "invoice",
  defaultVatRate = DEFAULT_VAT_RATE,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  mode?: "invoice" | "estimate";
  defaultVatRate?: number;
}) {
  const isEstimate = mode === "estimate";
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([newLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerVehicles = useMemo(
    () => (customerId ? vehicles.filter((v) => v.customerId === customerId) : []),
    [customerId, vehicles]
  );

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  function updateLineItem(id: string, patch: Partial<DraftLineItem>) {
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }

  function addLineItem() {
    setLineItems((items) => [...items, newLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => (items.length > 1 ? items.filter((li) => li.id !== id) : items));
  }

  function reset() {
    setCustomerId("");
    setVatRate(defaultVatRate);
    setLineItems([newLineItem()]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addInvoice({
      customerId,
      vehicleId: String(formData.get("vehicle") ?? ""),
      invoiceDate: String(formData.get("invoiceDate") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      vatRate,
      status: isEstimate ? "estimate" : "draft",
      notes: String(formData.get("notes") ?? ""),
      lineItems: lineItems.map(({ description, quantity, unitPrice }) => ({
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

  if (!can('invoices.manage')) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          isEstimate
            ? "flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            : "flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
        }
      >
        <Plus size={15} /> {isEstimate ? "New estimate" : "New invoice"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEstimate ? "Create Estimate" : "Create Invoice"}
        subtitle={
          isEstimate
            ? "Quote a customer before the work is confirmed"
            : "Raise a new invoice for a customer"
        }
        icon={isEstimate ? ClipboardList : Receipt}
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

            <FieldGroup label="Vehicle" htmlFor="vehicle" required>
              <Select
                id="vehicle"
                name="vehicle"
                icon={Car}
                required
                disabled={!customerId}
                defaultValue=""
              >
                <option value="" disabled>
                  {customerId ? "Select a vehicle" : "Select a customer first"}
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
            <FieldGroup label="Invoice Date" htmlFor="invoiceDate" required>
              <TextInput id="invoiceDate" name="invoiceDate" type="date" icon={Calendar} required />
            </FieldGroup>

            <FieldGroup label="Due Date" htmlFor="dueDate" required>
              <TextInput id="dueDate" name="dueDate" type="date" icon={Calendar} required />
            </FieldGroup>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
              >
                <Plus size={14} /> Add line
              </button>
            </div>
            <div className="space-y-2.5">
              {lineItems.map((li) => (
                <div
                  key={li.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <TextInput
                      aria-label="Description"
                      placeholder="Description"
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, { description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <TextInput
                      aria-label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={li.quantity}
                      onChange={(e) =>
                        updateLineItem(li.id, { quantity: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <TextInput
                      aria-label="Unit price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={li.unitPrice}
                      onChange={(e) =>
                        updateLineItem(li.id, { unitPrice: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(li.id)}
                      disabled={lineItems.length === 1}
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
              <TextArea
                id="notes"
                name="notes"
                rows={3}
                className="pl-9"
                placeholder="Payment terms, thank you note, etc."
              />
            </div>
          </FieldGroup>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
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
              {submitting
                ? "Creating..."
                : isEstimate
                  ? "Create Estimate"
                  : "Create Invoice"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

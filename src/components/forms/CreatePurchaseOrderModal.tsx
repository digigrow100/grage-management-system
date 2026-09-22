"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ClipboardList, PackagePlus, Plus, Trash2, Truck, Warehouse as WarehouseIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { createPurchaseOrder, type PurchaseOrderLineInput } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { Part, Supplier, Warehouse } from "@/lib/types";

interface DraftLine extends PurchaseOrderLineInput {
  id: string;
}

let lineSeq = 0;
function newLine(): DraftLine {
  lineSeq += 1;
  return { id: `draft_${lineSeq}`, partId: null, description: "", quantityOrdered: 1, unitCost: 0 };
}

export function CreatePurchaseOrderButton({
  suppliers,
  warehouses,
  parts,
}: {
  suppliers: Supplier[];
  warehouses: Warehouse[];
  parts: Part[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCost, 0);

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((items) => items.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((items) => [...items, newLine()]);
  }

  function removeLine(id: string) {
    setLines((items) => (items.length > 1 ? items.filter((l) => l.id !== id) : items));
  }

  function selectPart(id: string, partId: string) {
    const part = parts.find((p) => p.id === partId);
    updateLine(id, {
      partId: partId || null,
      description: part ? part.name : "",
      unitCost: part ? part.costPrice : 0,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createPurchaseOrder({
      supplierId: String(formData.get("supplierId") ?? "") || null,
      warehouseId: String(formData.get("warehouseId") ?? "") || null,
      orderDate: String(formData.get("orderDate") ?? "") || undefined,
      expectedDate: String(formData.get("expectedDate") ?? "") || undefined,
      notes: String(formData.get("notes") ?? ""),
      lines: lines.map(({ partId, description, quantityOrdered, unitCost }) => ({
        partId,
        description,
        quantityOrdered,
        unitCost,
      })),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setLines([newLine()]);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New purchase order
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Purchase Order"
        subtitle="Order stock from a supplier"
        icon={PackagePlus}
        maxWidth="max-w-2xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Supplier" htmlFor="supplierId">
              <Select id="supplierId" name="supplierId" icon={Truck} defaultValue="">
                <option value="">No supplier selected</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Deliver to" htmlFor="warehouseId">
              <Select id="warehouseId" name="warehouseId" icon={WarehouseIcon} defaultValue={warehouses.find((w) => w.isDefault)?.id ?? ""}>
                <option value="">No warehouse selected</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Order Date" htmlFor="orderDate">
              <TextInput id="orderDate" name="orderDate" type="date" icon={Calendar} />
            </FieldGroup>
            <FieldGroup label="Expected Date" htmlFor="expectedDate">
              <TextInput id="expectedDate" name="expectedDate" type="date" icon={Calendar} />
            </FieldGroup>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lines</p>
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_2fr_80px_100px_auto]">
                <Select
                  aria-label="Part"
                  value={line.partId ?? ""}
                  onChange={(e) => selectPart(line.id, e.target.value)}
                >
                  <option value="">Free text line</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </Select>
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
                  min="1"
                  step="1"
                  value={line.quantityOrdered}
                  onChange={(e) => updateLine(line.id, { quantityOrdered: Number(e.target.value) })}
                />
                <TextInput
                  aria-label="Unit cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(line.id, { unitCost: Number(e.target.value) })}
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

          <div className="flex justify-end text-sm text-slate-600">
            Total: <span className="ml-1 font-semibold text-slate-900">{formatCurrency(total)}</span>
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <div className="relative">
              <ClipboardList size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <TextArea id="notes" name="notes" rows={2} className="pl-9" />
            </div>
          </FieldGroup>

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
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

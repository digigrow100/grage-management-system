"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { addWarehouse, updateWarehouse } from "@/lib/supabase/mutations";
import type { Warehouse } from "@/lib/types";

function WarehouseForm({
  warehouse,
  onDone,
}: {
  warehouse?: Warehouse;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input = {
      name: String(formData.get("name") ?? ""),
      isDefault: formData.get("isDefault") === "on",
      addressLine1: String(formData.get("addressLine1") ?? ""),
      city: String(formData.get("city") ?? ""),
      postcode: String(formData.get("postcode") ?? ""),
    };
    const result = warehouse
      ? await updateWarehouse(warehouse.id, input)
      : await addWarehouse(input);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldGroup label="Warehouse Name" htmlFor="name" required>
        <TextInput id="name" name="name" icon={WarehouseIcon} required defaultValue={warehouse?.name} />
      </FieldGroup>

      <FieldGroup label="Address" htmlFor="addressLine1">
        <TextInput id="addressLine1" name="addressLine1" defaultValue={warehouse?.addressLine1 ?? ""} />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="City" htmlFor="city">
          <TextInput id="city" name="city" defaultValue={warehouse?.city ?? ""} />
        </FieldGroup>
        <FieldGroup label="Postcode" htmlFor="postcode">
          <TextInput id="postcode" name="postcode" defaultValue={warehouse?.postcode ?? ""} />
        </FieldGroup>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isDefault" defaultChecked={warehouse?.isDefault ?? false} className="rounded border-slate-300" />
        Default location for new receipts
      </label>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : warehouse ? "Save Changes" : "Add Warehouse"}
        </button>
      </div>
    </form>
  );
}

export function AddWarehouseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New warehouse
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Warehouse" icon={WarehouseIcon} maxWidth="max-w-lg">
        <WarehouseForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditWarehouseButton({ warehouse }: { warehouse: Warehouse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${warehouse.name}`}
      >
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Warehouse" icon={Pencil} maxWidth="max-w-lg">
        <WarehouseForm warehouse={warehouse} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

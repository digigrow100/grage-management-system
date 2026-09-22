"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Pencil, Phone, Plus, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { addSupplier, updateSupplier } from "@/lib/supabase/mutations";
import type { Supplier } from "@/lib/types";

function SupplierForm({
  supplier,
  onDone,
}: {
  supplier?: Supplier;
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
      accountNumber: String(formData.get("accountNumber") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      city: String(formData.get("city") ?? ""),
      postcode: String(formData.get("postcode") ?? ""),
    };
    const result = supplier
      ? await updateSupplier(supplier.id, input)
      : await addSupplier(input);

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
      <FieldGroup label="Supplier Name" htmlFor="name" required>
        <TextInput id="name" name="name" icon={Building2} required defaultValue={supplier?.name} />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Account Number" htmlFor="accountNumber">
          <TextInput id="accountNumber" name="accountNumber" defaultValue={supplier?.accountNumber ?? ""} />
        </FieldGroup>
        <FieldGroup label="Contact Name" htmlFor="contactName">
          <TextInput id="contactName" name="contactName" icon={User} defaultValue={supplier?.contactName ?? ""} />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Email" htmlFor="email">
          <TextInput id="email" name="email" type="email" icon={Mail} defaultValue={supplier?.email ?? ""} />
        </FieldGroup>
        <FieldGroup label="Phone" htmlFor="phone">
          <TextInput id="phone" name="phone" icon={Phone} defaultValue={supplier?.phone ?? ""} />
        </FieldGroup>
      </div>

      <FieldGroup label="Address" htmlFor="addressLine1">
        <TextInput id="addressLine1" name="addressLine1" defaultValue={supplier?.addressLine1 ?? ""} />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="City" htmlFor="city">
          <TextInput id="city" name="city" defaultValue={supplier?.city ?? ""} />
        </FieldGroup>
        <FieldGroup label="Postcode" htmlFor="postcode">
          <TextInput id="postcode" name="postcode" defaultValue={supplier?.postcode ?? ""} />
        </FieldGroup>
      </div>

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
          {submitting ? "Saving..." : supplier ? "Save Changes" : "Add Supplier"}
        </button>
      </div>
    </form>
  );
}

export function AddSupplierButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New supplier
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Supplier" icon={Building2} maxWidth="max-w-lg">
        <SupplierForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditSupplierButton({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${supplier.name}`}
      >
        <Pencil size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Supplier" icon={Pencil} maxWidth="max-w-lg">
        <SupplierForm supplier={supplier} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hash, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextArea, TextInput } from "@/components/ui/Field";
import { updateCustomer } from "@/lib/supabase/mutations";
import type { Customer } from "@/lib/types";

export function EditCustomerButton({ customer }: { customer: Customer }) {
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateCustomer(customer.id, {
      emailOptIn: formData.get("emailOptIn") === "on",
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: String(formData.get("addressLine") ?? ""),
      city: String(formData.get("city") ?? ""),
      postCode: String(formData.get("postCode") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!can('customers.manage')) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Pencil size={13} /> Edit
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Customer"
        subtitle="Update this customer's record"
        icon={Pencil}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Full Name" htmlFor="fullName" required>
            <TextInput
              id="fullName"
              name="fullName"
              icon={User}
              required
              defaultValue={customer.name}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Email" htmlFor="email" required>
              <TextInput
                id="email"
                name="email"
                type="email"
                icon={Mail}
                required
                defaultValue={customer.email}
              />
            </FieldGroup>

            <FieldGroup label="Phone Number" htmlFor="phone" required>
              <TextInput
                id="phone"
                name="phone"
                type="tel"
                icon={Phone}
                required
                defaultValue={customer.phone}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Address Line" htmlFor="addressLine" required>
            <TextInput
              id="addressLine"
              name="addressLine"
              icon={MapPin}
              required
              defaultValue={customer.address}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="City" htmlFor="city" required>
              <TextInput
                id="city"
                name="city"
                icon={Building2}
                required
                defaultValue={customer.city}
              />
            </FieldGroup>

            <FieldGroup label="Post-Code" htmlFor="postCode" required>
              <TextInput
                id="postCode"
                name="postCode"
                icon={Hash}
                required
                defaultValue={customer.postCode}
                className="uppercase"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Notes" htmlFor="notes" hint="Optional">
            <TextArea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={customer.notes ?? ""}
              placeholder="Anything worth flagging about this customer..."
            />
          </FieldGroup>

          <label className="flex items-center gap-2 text-sm"><input name="emailOptIn" type="checkbox" defaultChecked={customer.emailOptIn}/>Customer allows service reminder emails</label>
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

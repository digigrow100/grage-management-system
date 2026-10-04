"use client";
import {usePermission} from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Car,
  Hash,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  UserPlus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, FieldSection, TextInput } from "@/components/ui/Field";
import { addCustomer } from "@/lib/supabase/mutations";

export function AddCustomerButton() {
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
    const result = await addCustomer({
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: String(formData.get("addressLine") ?? ""),
      city: String(formData.get("city") ?? ""),
      postCode: String(formData.get("postCode") ?? ""),
      vehicleRegistration: String(formData.get("vehicleRegistration") ?? ""),
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
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New customer
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Customer"
        subtitle="Create a new customer record"
        icon={UserPlus}
        maxWidth="max-w-lg"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FieldSection title="Personal details">
            <FieldGroup label="Full Name" htmlFor="fullName" required>
              <TextInput
                id="fullName"
                name="fullName"
                icon={User}
                required
                placeholder="James Whitfield"
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
                  placeholder="james@example.com"
                />
              </FieldGroup>

              <FieldGroup label="Phone Number" htmlFor="phone" required>
                <TextInput
                  id="phone"
                  name="phone"
                  type="tel"
                  icon={Phone}
                  required
                  placeholder="07700 900123"
                />
              </FieldGroup>
            </div>
          </FieldSection>

          <FieldSection title="Address">
            <FieldGroup label="Address Line" htmlFor="addressLine" required>
              <TextInput
                id="addressLine"
                name="addressLine"
                icon={MapPin}
                required
                placeholder="14 Elm Grove"
              />
            </FieldGroup>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="City" htmlFor="city" required>
                <TextInput
                  id="city"
                  name="city"
                  icon={Building2}
                  required
                  placeholder="Manchester"
                />
              </FieldGroup>

              <FieldGroup label="Post-Code" htmlFor="postCode" required>
                <TextInput
                  id="postCode"
                  name="postCode"
                  icon={Hash}
                  required
                  placeholder="M14 5TR"
                  className="uppercase"
                />
              </FieldGroup>
            </div>
          </FieldSection>

          <FieldSection title="Vehicle">
            <FieldGroup
              label="Vehicle Registration"
              htmlFor="vehicleRegistration"
              hint="Optional"
            >
              <TextInput
                id="vehicleRegistration"
                name="vehicleRegistration"
                icon={Car}
                placeholder="LM19 XYZ"
                className="uppercase"
              />
            </FieldGroup>
          </FieldSection>

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
              {submitting ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

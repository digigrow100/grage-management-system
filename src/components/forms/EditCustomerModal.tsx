"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Pencil, Phone, User, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, FieldSection, TextArea, TextInput } from "@/components/ui/Field";
import { AddressAutocomplete, type AddressValue } from "@/components/forms/AddressAutocomplete";
import { updateCustomer } from "@/lib/supabase/mutations";
import type { Customer, CustomerType } from "@/lib/types";
import { cn } from "@/lib/cn";

export function EditCustomerButton({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>(
    customer.customerType ?? "individual"
  );
  const [address, setAddress] = useState<AddressValue>({
    addressLine: customer.address,
    addressLine2: customer.addressLine2 ?? "",
    city: customer.city,
    county: customer.county ?? "",
    postCode: customer.postCode,
    countryCode: customer.countryCode ?? "GB",
    googlePlaceId: customer.googlePlaceId ?? null,
    latitude: customer.latitude ?? null,
    longitude: customer.longitude ?? null,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    const fullName =
      customerType === "business" ? businessName : [firstName, lastName].filter(Boolean).join(" ");

    const result = await updateCustomer(customer.id, {
      customerType,
      fullName: fullName || customer.name,
      firstName: customerType === "individual" ? firstName : undefined,
      lastName: customerType === "individual" ? lastName : undefined,
      businessName: customerType === "business" ? businessName : undefined,
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: address.addressLine,
      addressLine2: address.addressLine2,
      city: address.city,
      county: address.county,
      postCode: address.postCode,
      countryCode: address.countryCode,
      googlePlaceId: address.googlePlaceId,
      latitude: address.latitude,
      longitude: address.longitude,
      emailOptIn: formData.get("emailOptIn") === "on",
      smsOptIn: formData.get("smsOptIn") === "on",
      marketingOptIn: formData.get("marketingOptIn") === "on",
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
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FieldSection title="Customer type">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerType("individual")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  customerType === "individual"
                    ? "border-accent-600 bg-accent-50 text-accent-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <User size={15} /> Individual
              </button>
              <button
                type="button"
                onClick={() => setCustomerType("business")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  customerType === "business"
                    ? "border-accent-600 bg-accent-50 text-accent-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Users size={15} /> Business
              </button>
            </div>
          </FieldSection>

          {customerType === "individual" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="First name" htmlFor="firstName" required>
                <TextInput
                  id="firstName"
                  name="firstName"
                  icon={User}
                  required
                  defaultValue={customer.firstName ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Last name" htmlFor="lastName" required>
                <TextInput
                  id="lastName"
                  name="lastName"
                  required
                  defaultValue={customer.lastName ?? ""}
                />
              </FieldGroup>
            </div>
          ) : (
            <FieldGroup label="Business name" htmlFor="businessName" required>
              <TextInput
                id="businessName"
                name="businessName"
                icon={Building2}
                required
                defaultValue={customer.businessName ?? ""}
              />
            </FieldGroup>
          )}

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

          <AddressAutocomplete value={address} onChange={setAddress} />

          <FieldSection title="Communication preferences">
            <div className="space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="emailOptIn"
                  defaultChecked={customer.emailOptIn ?? true}
                  className="rounded border-slate-300"
                />
                Email reminders and updates
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="smsOptIn"
                  defaultChecked={customer.smsOptIn ?? false}
                  className="rounded border-slate-300"
                />
                SMS reminders and updates
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="marketingOptIn"
                  defaultChecked={customer.marketingOptIn ?? false}
                  className="rounded border-slate-300"
                />
                Marketing communications
              </label>
            </div>
          </FieldSection>

          <FieldGroup label="Notes" htmlFor="notes" hint="Optional">
            <TextArea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={customer.notes ?? ""}
              placeholder="Anything worth flagging about this customer..."
            />
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

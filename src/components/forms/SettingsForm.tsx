"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Clock, Globe, Hash, Mail, MapPin, Percent, Phone, PoundSterling, Receipt } from "lucide-react";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { updateGarageSettings } from "@/lib/supabase/mutations";
import type { GarageSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: GarageSettings }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const formData = new FormData(e.currentTarget);
    const result = await updateGarageSettings(settings.id, {
      garageName: String(formData.get("garageName") ?? ""),
      addressLine: String(formData.get("addressLine") ?? ""),
      city: String(formData.get("city") ?? ""),
      postCode: String(formData.get("postCode") ?? ""),
      vatNumber: String(formData.get("vatNumber") ?? ""),
      defaultVatRate: Number(formData.get("defaultVatRate") ?? 20),
      invoicePrefix: String(formData.get("invoicePrefix") ?? "INV"),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      timezone: String(formData.get("timezone") ?? "Europe/London"),
      currency: String(formData.get("currency") ?? "GBP"),
      vatMode: formData.get("vatMode") as "not_registered" | "inclusive" | "exclusive",
      defaultLabourRate: Number(formData.get("defaultLabourRate") ?? 0),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Garage profile" subtitle="Shown on invoices and estimates" />
      <CardBody>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Garage Name" htmlFor="garageName" required>
            <TextInput id="garageName" name="garageName" icon={Building2} required defaultValue={settings.garageName} />
          </FieldGroup>

          <FieldGroup label="Address" htmlFor="addressLine">
            <TextInput id="addressLine" name="addressLine" icon={MapPin} defaultValue={settings.addressLine} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="City" htmlFor="city">
              <TextInput id="city" name="city" icon={MapPin} defaultValue={settings.city} />
            </FieldGroup>
            <FieldGroup label="Post Code" htmlFor="postCode">
              <TextInput id="postCode" name="postCode" icon={MapPin} defaultValue={settings.postCode} />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="VAT Number" htmlFor="vatNumber">
              <TextInput id="vatNumber" name="vatNumber" icon={Hash} defaultValue={settings.vatNumber} />
            </FieldGroup>
            <FieldGroup label="Default VAT Rate (%)" htmlFor="defaultVatRate">
              <TextInput
                id="defaultVatRate"
                name="defaultVatRate"
                type="number"
                icon={Percent}
                min="0"
                max="100"
                step="1"
                defaultValue={settings.defaultVatRate}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Invoice Number Prefix" htmlFor="invoicePrefix" hint="e.g. INV-1001">
            <TextInput id="invoicePrefix" name="invoicePrefix" icon={Receipt} defaultValue={settings.invoicePrefix} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Contact Email" htmlFor="contactEmail" hint="Optional">
              <TextInput
                id="contactEmail"
                name="contactEmail"
                type="email"
                icon={Mail}
                defaultValue={settings.contactEmail ?? ""}
              />
            </FieldGroup>
            <FieldGroup label="Contact Phone" htmlFor="contactPhone" hint="Optional">
              <TextInput
                id="contactPhone"
                name="contactPhone"
                type="tel"
                icon={Phone}
                defaultValue={settings.contactPhone ?? ""}
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Timezone" htmlFor="timezone" hint="IANA name">
              <TextInput
                id="timezone"
                name="timezone"
                icon={Clock}
                defaultValue={settings.timezone ?? "Europe/London"}
              />
            </FieldGroup>
            <FieldGroup label="Currency" htmlFor="currency" hint="3-letter code">
              <TextInput
                id="currency"
                name="currency"
                icon={Globe}
                maxLength={3}
                className="uppercase"
                defaultValue={settings.currency ?? "GBP"}
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="VAT Mode" htmlFor="vatMode">
              <Select id="vatMode" name="vatMode" defaultValue={settings.vatMode ?? "not_registered"}>
                <option value="not_registered">Not VAT registered</option>
                <option value="inclusive">Prices include VAT</option>
                <option value="exclusive">Prices exclude VAT</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Default Labour Rate (£/hr)" htmlFor="defaultLabourRate">
              <TextInput
                id="defaultLabourRate"
                name="defaultLabourRate"
                type="number"
                icon={PoundSterling}
                min="0"
                step="0.01"
                defaultValue={settings.defaultLabourRate ?? 0}
              />
            </FieldGroup>
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {saved && !error ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Settings saved.</p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

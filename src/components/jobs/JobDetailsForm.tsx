"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FieldGroup, TextArea, TextInput } from "@/components/ui/Field";
import { recordVehicleMileage, updateJobDetails } from "@/lib/supabase/mutations";

export function JobDetailsForm({
  jobId,
  mileageIn,
  customerComplaint,
  internalNotes,
  hasVehicle,
}: {
  jobId: string;
  mileageIn: number | null | undefined;
  customerComplaint: string | null | undefined;
  internalNotes: string | null | undefined;
  hasVehicle: boolean;
}) {
  const router = useRouter();
  const [mileage, setMileage] = useState(mileageIn?.toString() ?? "");
  const [complaint, setComplaint] = useState(customerComplaint ?? "");
  const [notes, setNotes] = useState(internalNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    if (hasVehicle && mileage.trim()) {
      const parsed = Number(mileage);
      if (Number.isNaN(parsed) || parsed < 0) {
        setSaving(false);
        setError("Mileage must be a positive number.");
        return;
      }
      const mileageResult = await recordVehicleMileage(jobId, parsed);
      if (mileageResult.error) {
        setSaving(false);
        setError(mileageResult.error);
        return;
      }
    }

    const result = await updateJobDetails(jobId, {
      customerComplaint: complaint,
      internalNotes: notes,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {hasVehicle ? (
        <FieldGroup label="Mileage in" htmlFor="mileageIn">
          <TextInput
            id="mileageIn"
            type="number"
            min="0"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="e.g. 48200"
          />
        </FieldGroup>
      ) : null}

      <FieldGroup label="Customer complaint" htmlFor="customerComplaint" hint="What the customer reported">
        <TextArea
          id="customerComplaint"
          rows={2}
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. Grinding noise when braking"
        />
      </FieldGroup>

      <FieldGroup label="Internal notes" htmlFor="internalNotes" hint="Staff only">
        <TextArea
          id="internalNotes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for the workshop team..."
        />
      </FieldGroup>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving..." : "Save details"}
        </button>
        {saved && !error ? <span className="text-xs text-emerald-700">Saved</span> : null}
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}

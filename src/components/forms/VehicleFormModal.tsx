"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Loader2, Pencil, Plus, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, FieldSection, TextInput } from "@/components/ui/Field";
import { addVehicle, updateVehicle, type VehicleInput } from "@/lib/supabase/mutations";
import type { Vehicle } from "@/lib/types";

interface DvlaVehicleSummary {
  make?: string;
  colour?: string;
  fuelType?: string;
  yearOfManufacture?: number;
  monthOfFirstRegistration?: string;
  engineCapacity?: number;
  co2Emissions?: number;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  dateOfLastV5CIssued?: string;
  typeApproval?: string;
  wheelplan?: string;
  euroStatus?: string;
  markedForExport?: boolean;
}

function emptyDraft(registration = ""): VehicleInput {
  return {
    registration,
    make: "",
    model: "",
    year: undefined,
    colour: "",
    mileage: undefined,
    motDue: "",
    lastServiceDate: "",
  };
}

function draftFromVehicle(v: Vehicle): VehicleInput {
  return {
    registration: v.registration,
    make: v.make ?? "",
    model: v.model ?? "",
    year: v.year ?? undefined,
    colour: v.colour ?? "",
    mileage: v.mileage ?? undefined,
    motDue: v.motDue ?? "",
    lastServiceDate: v.lastServiceDate ?? "",
    vin: v.vin,
    fuelType: v.fuelType,
    engineCapacityCc: v.engineCapacityCc,
    co2Emissions: v.co2Emissions,
    taxStatus: v.taxStatus,
    taxDueDate: v.taxDueDate,
    motStatus: v.motStatus,
    monthOfFirstRegistration: v.monthOfFirstRegistration,
    dateOfLastV5cIssued: v.dateOfLastV5cIssued,
    typeApproval: v.typeApproval,
    wheelplan: v.wheelplan,
    euroStatus: v.euroStatus,
    markedForExport: v.markedForExport,
    dvlaLastCheckedAt: v.dvlaLastCheckedAt,
  };
}

function applyDvlaResult(draft: VehicleInput, dvla: DvlaVehicleSummary): VehicleInput {
  return {
    ...draft,
    make: dvla.make || draft.make,
    colour: dvla.colour || draft.colour,
    year: dvla.yearOfManufacture ?? draft.year,
    fuelType: dvla.fuelType ?? draft.fuelType,
    engineCapacityCc: dvla.engineCapacity ?? draft.engineCapacityCc,
    co2Emissions: dvla.co2Emissions ?? draft.co2Emissions,
    taxStatus: dvla.taxStatus ?? draft.taxStatus,
    taxDueDate: dvla.taxDueDate ?? draft.taxDueDate,
    motStatus: dvla.motStatus ?? draft.motStatus,
    monthOfFirstRegistration: dvla.monthOfFirstRegistration ?? draft.monthOfFirstRegistration,
    dateOfLastV5cIssued: dvla.dateOfLastV5CIssued ?? draft.dateOfLastV5cIssued,
    typeApproval: dvla.typeApproval ?? draft.typeApproval,
    wheelplan: dvla.wheelplan ?? draft.wheelplan,
    euroStatus: dvla.euroStatus ?? draft.euroStatus,
    markedForExport: dvla.markedForExport ?? draft.markedForExport,
    dvlaLastCheckedAt: new Date().toISOString(),
  };
}

function VehicleFields({
  draft,
  setDraft,
}: {
  draft: VehicleInput;
  setDraft: (next: VehicleInput) => void;
}) {
  return (
    <FieldSection title="Vehicle details">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Make" htmlFor="make">
          <TextInput
            id="make"
            value={draft.make ?? ""}
            onChange={(e) => setDraft({ ...draft, make: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Model" htmlFor="model">
          <TextInput
            id="model"
            value={draft.model ?? ""}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Colour" htmlFor="colour">
          <TextInput
            id="colour"
            value={draft.colour ?? ""}
            onChange={(e) => setDraft({ ...draft, colour: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Year" htmlFor="year">
          <TextInput
            id="year"
            type="number"
            value={draft.year ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, year: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Mileage" htmlFor="mileage">
          <TextInput
            id="mileage"
            type="number"
            value={draft.mileage ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                mileage: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </FieldGroup>
        <FieldGroup label="MOT due" htmlFor="motDue">
          <TextInput
            id="motDue"
            type="date"
            value={draft.motDue ?? ""}
            onChange={(e) => setDraft({ ...draft, motDue: e.target.value })}
          />
        </FieldGroup>
      </div>
      {draft.fuelType || draft.taxStatus || draft.motStatus ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p className="font-medium">DVLA data on file</p>
          <p>
            {[draft.fuelType, draft.taxStatus && `Tax: ${draft.taxStatus}`, draft.motStatus && `MOT: ${draft.motStatus}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}
    </FieldSection>
  );
}

export function AddVehicleButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VehicleInput>(emptyDraft());
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">(
    "idle"
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!draft.registration.trim()) return;
    setLookupState("loading");
    setLookupError(null);
    try {
      const response = await fetch("/api/vehicles/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: draft.registration }),
      });
      const body = await response.json();
      if (!response.ok) {
        setLookupState(response.status === 404 ? "not_found" : "idle");
        setLookupError(body.error ?? "Lookup failed.");
        return;
      }
      setDraft((d) => applyDvlaResult(d, body.vehicle));
      setLookupState("found");
    } catch {
      setLookupState("idle");
      setLookupError("Lookup failed. Enter the vehicle manually.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addVehicle(customerId, {
      ...draft,
      registration: String(formData.get("registration") ?? draft.registration),
      make: String(formData.get("make") ?? draft.make ?? ""),
      model: String(formData.get("model") ?? draft.model ?? ""),
      colour: String(formData.get("colour") ?? draft.colour ?? ""),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setDraft(emptyDraft());
    setLookupState("idle");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Plus size={13} /> Add vehicle
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Vehicle"
        subtitle="Look up by registration, or enter details manually"
        icon={Car}
        maxWidth="max-w-lg"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FieldSection title="Registration">
            <FieldGroup label="Registration number" htmlFor="registration" required>
              <div className="flex gap-2">
                <TextInput
                  id="registration"
                  name="registration"
                  required
                  className="uppercase"
                  value={draft.registration}
                  onChange={(e) => {
                    setDraft({ ...draft, registration: e.target.value });
                    setLookupState("idle");
                  }}
                  placeholder="LM19 XYZ"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupState === "loading" || !draft.registration.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {lookupState === "loading" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Find vehicle
                </button>
              </div>
              {lookupState === "found" ? (
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2 size={13} /> Found — review and confirm below.
                </p>
              ) : null}
              {lookupError ? <p className="text-xs text-amber-700">{lookupError}</p> : null}
            </FieldGroup>
          </FieldSection>

          <VehicleFields draft={draft} setDraft={setDraft} />

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
              {submitting ? "Adding..." : "Add Vehicle"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditVehicleButton({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VehicleInput>(() => draftFromVehicle(vehicle));
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">(
    "idle"
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!draft.registration.trim()) return;
    setLookupState("loading");
    setLookupError(null);
    try {
      const response = await fetch("/api/vehicles/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: draft.registration }),
      });
      const body = await response.json();
      if (!response.ok) {
        setLookupState(response.status === 404 ? "not_found" : "idle");
        setLookupError(body.error ?? "Lookup failed.");
        return;
      }
      setDraft((d) => applyDvlaResult(d, body.vehicle));
      setLookupState("found");
    } catch {
      setLookupState("idle");
      setLookupError("Lookup failed. Enter the vehicle manually.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateVehicle(vehicle.id, {
      ...draft,
      registration: String(formData.get("registration") ?? draft.registration),
      make: String(formData.get("make") ?? draft.make ?? ""),
      model: String(formData.get("model") ?? draft.model ?? ""),
      colour: String(formData.get("colour") ?? draft.colour ?? ""),
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
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Pencil size={12} /> Edit
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Vehicle"
        subtitle="Update this vehicle's record, or re-run a DVLA lookup"
        icon={Car}
        maxWidth="max-w-lg"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FieldSection title="Registration">
            <FieldGroup label="Registration number" htmlFor="registration" required>
              <div className="flex gap-2">
                <TextInput
                  id="registration"
                  name="registration"
                  required
                  className="uppercase"
                  value={draft.registration}
                  onChange={(e) => {
                    setDraft({ ...draft, registration: e.target.value });
                    setLookupState("idle");
                  }}
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupState === "loading" || !draft.registration.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {lookupState === "loading" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Find vehicle
                </button>
              </div>
              {lookupState === "found" ? (
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2 size={13} /> Found — review and confirm below.
                </p>
              ) : null}
              {lookupError ? <p className="text-xs text-amber-700">{lookupError}</p> : null}
            </FieldGroup>
          </FieldSection>

          <VehicleFields draft={draft} setDraft={setDraft} />

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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

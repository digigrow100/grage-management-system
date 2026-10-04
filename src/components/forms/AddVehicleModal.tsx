"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Car, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { addVehicle } from "@/lib/supabase/mutations";

export function AddVehicleButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    setPending(true);
    setError(null);
    try {
      const result = await addVehicle({
        customerId, registration: text("registration"), make: text("make"), model: text("model"),
        colour: text("colour"), year: text("year") ? Number(text("year")) : undefined,
        mileage: text("mileage") ? Number(text("mileage")) : undefined,
        motDue: text("motDue"), lastServiceDate: text("lastServiceDate"),
      });
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save the vehicle. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <button type="button" onClick={() => { setError(null); setOpen(true); }} className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-xs font-medium text-white hover:bg-accent-700">
      <Plus size={14} /> Add Vehicle
    </button>
    <Modal open={open} onClose={() => { if (!pending) setOpen(false); }} title="Add Vehicle" subtitle={`Add a vehicle for ${customerName}`} icon={Car}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={pending} className="space-y-5">
          <FieldGroup label="Registration" htmlFor="vehicle-registration" required>
            <TextInput id="vehicle-registration" name="registration" required maxLength={20} autoFocus className="uppercase" placeholder="LM19 XYZ" />
          </FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            {([['make', 'Make'], ['model', 'Model'], ['colour', 'Colour']] as const).map(([name, label]) => (
              <FieldGroup key={name} label={label} htmlFor={`vehicle-${name}`} hint="Optional">
                <TextInput id={`vehicle-${name}`} name={name} />
              </FieldGroup>
            ))}
            <FieldGroup label="Year" htmlFor="vehicle-year" hint="Optional">
              <TextInput id="vehicle-year" name="year" type="number" min={1886} max={new Date().getFullYear() + 1} step={1} />
            </FieldGroup>
            <FieldGroup label="Mileage (miles)" htmlFor="vehicle-mileage" hint="Optional">
              <TextInput id="vehicle-mileage" name="mileage" type="number" min={0} max={2147483647} step={1} />
            </FieldGroup>
            <FieldGroup label="MOT due" htmlFor="vehicle-mot" hint="Optional">
              <TextInput id="vehicle-mot" name="motDue" type="date" />
            </FieldGroup>
            <FieldGroup label="Last service" htmlFor="vehicle-service" hint="Optional">
              <TextInput id="vehicle-service" name="lastServiceDate" type="date" />
            </FieldGroup>
          </div>
        </fieldset>
        {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60">{pending ? "Saving..." : "Add Vehicle"}</button>
        </div>
      </form>
    </Modal>
  </>;
}

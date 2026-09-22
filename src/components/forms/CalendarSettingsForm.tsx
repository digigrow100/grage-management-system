"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { updateCalendarSettings } from "@/lib/supabase/mutations";
import type { GarageSettings } from "@/lib/types";

export function CalendarSettingsForm({ settings }: { settings: GarageSettings }) {
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
    const result = await updateCalendarSettings({
      calendarStartHour: Number(formData.get("calendarStartHour") ?? 8),
      calendarEndHour: Number(formData.get("calendarEndHour") ?? 18),
      calendarSlotMinutes: Number(formData.get("calendarSlotMinutes") ?? 30),
      allowOverlappingJobs: formData.get("allowOverlappingJobs") === "on",
      smartGapMinutes: Number(formData.get("smartGapMinutes") ?? 0),
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
      <CardHeader title="Calendar behaviour" subtitle="Controls the diary and booking conflict checks" />
      <CardBody>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldGroup label="Day starts at" htmlFor="calendarStartHour">
              <TextInput
                id="calendarStartHour"
                name="calendarStartHour"
                type="number"
                min="0"
                max="23"
                defaultValue={settings.calendarStartHour ?? 8}
              />
            </FieldGroup>
            <FieldGroup label="Day ends at" htmlFor="calendarEndHour">
              <TextInput
                id="calendarEndHour"
                name="calendarEndHour"
                type="number"
                min="1"
                max="24"
                defaultValue={settings.calendarEndHour ?? 18}
              />
            </FieldGroup>
            <FieldGroup label="Slot size (mins)" htmlFor="calendarSlotMinutes">
              <Select
                id="calendarSlotMinutes"
                name="calendarSlotMinutes"
                defaultValue={String(settings.calendarSlotMinutes ?? 30)}
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup label="Smart gap between jobs (mins)" htmlFor="smartGapMinutes" hint="0 disables the prompt">
            <TextInput
              id="smartGapMinutes"
              name="smartGapMinutes"
              type="number"
              min="0"
              defaultValue={settings.smartGapMinutes ?? 0}
            />
          </FieldGroup>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="allowOverlappingJobs"
              defaultChecked={settings.allowOverlappingJobs ?? false}
              className="rounded border-slate-300"
            />
            Allow a technician to be double-booked
          </label>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {saved && !error ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Calendar settings saved.</p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Calendar Settings"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

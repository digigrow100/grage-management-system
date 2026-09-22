"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { updateReminderSettings } from "@/lib/supabase/mutations";
import type { ReminderSettings, ReminderType } from "@/lib/types";

const TYPES: { value: ReminderType; label: string; defaultDaysBefore: number }[] = [
  { value: "mot", label: "MOT due", defaultDaysBefore: 14 },
  { value: "service", label: "Service due", defaultDaysBefore: 7 },
  { value: "booking", label: "Booking reminder", defaultDaysBefore: 1 },
  { value: "general", label: "General reminders", defaultDaysBefore: 0 },
];

export function ReminderSettingsForm({ settings }: { settings: ReminderSettings[] }) {
  const router = useRouter();
  const byType = new Map(settings.map((s) => [s.reminderType, s]));
  const [savingType, setSavingType] = useState<ReminderType | null>(null);

  async function handleSave(type: ReminderType, form: HTMLFormElement) {
    setSavingType(type);
    const formData = new FormData(form);
    await updateReminderSettings({
      reminderType: type,
      enabled: formData.get("enabled") === "on",
      daysBefore: formData.get("daysBefore") ? Number(formData.get("daysBefore")) : undefined,
      emailEnabled: formData.get("emailEnabled") === "on",
    });
    setSavingType(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Reminder timings" subtitle="When each reminder type fires, and whether email is offered" />
      <CardBody className="space-y-4">
        {TYPES.map(({ value, label, defaultDaysBefore }) => {
          const existing = byType.get(value);
          return (
            <form
              key={value}
              className="grid grid-cols-1 items-center gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(value, e.currentTarget);
              }}
            >
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={existing?.enabled ?? true}
                  className="rounded border-slate-300"
                />
                Enabled
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="number"
                  name="daysBefore"
                  min="0"
                  defaultValue={existing?.daysBefore ?? defaultDaysBefore}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1"
                />
                days before
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    name="emailEnabled"
                    defaultChecked={existing?.emailEnabled ?? false}
                    className="rounded border-slate-300"
                  />
                  Email
                </label>
                <button
                  type="submit"
                  disabled={savingType === value}
                  className="rounded-lg bg-accent-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
                >
                  {savingType === value ? "..." : "Save"}
                </button>
              </div>
            </form>
          );
        })}
        <p className="text-xs text-slate-400">
          Email delivery isn&apos;t connected yet — enabling it here records the preference for when a provider is configured.
        </p>
      </CardBody>
    </Card>
  );
}

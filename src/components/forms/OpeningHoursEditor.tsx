"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { updateOpeningHours, type OpeningHoursDayInput } from "@/lib/supabase/mutations";
import type { GarageOpeningHours } from "@/lib/types";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildInitialDays(existing: GarageOpeningHours[]): OpeningHoursDayInput[] {
  const byWeekday = new Map(existing.map((h) => [h.weekday, h]));
  return Array.from({ length: 7 }, (_, weekday) => {
    const row = byWeekday.get(weekday);
    if (row) {
      return {
        weekday,
        isClosed: row.isClosed,
        is24Hours: row.is24Hours,
        opensAt: row.opensAt ?? "08:00",
        closesAt: row.closesAt ?? "18:00",
      };
    }
    // Sensible defaults for a garage that hasn't configured hours yet:
    // Mon-Fri open, weekends closed.
    const isWeekend = weekday === 0 || weekday === 6;
    return {
      weekday,
      isClosed: isWeekend,
      is24Hours: false,
      opensAt: "08:00",
      closesAt: "18:00",
    };
  });
}

export function OpeningHoursEditor({ openingHours }: { openingHours: GarageOpeningHours[] }) {
  const router = useRouter();
  const [days, setDays] = useState<OpeningHoursDayInput[]>(() => buildInitialDays(openingHours));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateDay(weekday: number, patch: Partial<OpeningHoursDayInput>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
    setSaved(false);
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const result = await updateOpeningHours(days);
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
      <CardHeader
        title="Opening hours"
        subtitle="Bookings outside these hours are blocked automatically"
      />
      <CardBody className="space-y-3">
        {days.map((d) => (
          <div
            key={d.weekday}
            className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-100 p-2.5 sm:grid-cols-[110px_auto_1fr_1fr]"
          >
            <span className="text-sm font-medium text-slate-700">{WEEKDAY_LABELS[d.weekday]}</span>
            <div className="flex gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={d.isClosed}
                  onChange={(e) => updateDay(d.weekday, { isClosed: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Closed
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={d.is24Hours}
                  disabled={d.isClosed}
                  onChange={(e) => updateDay(d.weekday, { is24Hours: e.target.checked })}
                  className="rounded border-slate-300 disabled:opacity-40"
                />
                24 hours
              </label>
            </div>
            <input
              type="time"
              value={d.opensAt ?? ""}
              disabled={d.isClosed || d.is24Hours}
              onChange={(e) => updateDay(d.weekday, { opensAt: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:opacity-40"
            />
            <input
              type="time"
              value={d.closesAt ?? ""}
              disabled={d.isClosed || d.is24Hours}
              onChange={(e) => updateDay(d.weekday, { closesAt: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:opacity-40"
            />
          </div>
        ))}

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {saved && !error ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Opening hours saved.</p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Hours"}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

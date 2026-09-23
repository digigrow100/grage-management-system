"use client";

import { useState } from "react";
import { submitBookingRequest } from "@/lib/supabase/mutations";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/job-types";
import type { JobType } from "@/lib/types";

export function BookingRequestForm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitBookingRequest(token, {
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      vehicleRegistration: String(formData.get("vehicleRegistration") ?? ""),
      vehicleMake: String(formData.get("vehicleMake") ?? ""),
      vehicleModel: String(formData.get("vehicleModel") ?? ""),
      jobType: String(formData.get("jobType") ?? "other") as JobType,
      preferredDate: String(formData.get("preferredDate") ?? ""),
      preferredTime: String(formData.get("preferredTime") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">Request sent!</p>
        <p className="mt-1 text-sm text-emerald-700">
          Thanks — we&apos;ll be in touch shortly to confirm your booking.
        </p>
      </div>
    );
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="text-sm font-medium text-slate-700">
            Your name
          </label>
          <input id="customerName" name="customerName" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="jobType" className="text-sm font-medium text-slate-700">
            What do you need?
          </label>
          <select id="jobType" name="jobType" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select an option
            </option>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {JOB_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerEmail" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input id="customerEmail" name="customerEmail" type="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="customerPhone" className="text-sm font-medium text-slate-700">
            Phone
          </label>
          <input id="customerPhone" name="customerPhone" type="tel" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="vehicleRegistration" className="text-sm font-medium text-slate-700">
            Registration
          </label>
          <input id="vehicleRegistration" name="vehicleRegistration" className={inputClass} />
        </div>
        <div>
          <label htmlFor="vehicleMake" className="text-sm font-medium text-slate-700">
            Make
          </label>
          <input id="vehicleMake" name="vehicleMake" className={inputClass} />
        </div>
        <div>
          <label htmlFor="vehicleModel" className="text-sm font-medium text-slate-700">
            Model
          </label>
          <input id="vehicleModel" name="vehicleModel" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredDate" className="text-sm font-medium text-slate-700">
            Preferred date
          </label>
          <input id="preferredDate" name="preferredDate" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="preferredTime" className="text-sm font-medium text-slate-700">
            Preferred time
          </label>
          <input id="preferredTime" name="preferredTime" type="time" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Anything else we should know? (optional)
        </label>
        <textarea id="notes" name="notes" rows={3} className={`${inputClass} resize-none`} />
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send booking request"}
      </button>
    </form>
  );
}

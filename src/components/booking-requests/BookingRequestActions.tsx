"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, CalendarClock, User, Clock, Timer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextInput } from "@/components/ui/Field";
import { acceptBookingRequest, declineBookingRequest } from "@/lib/supabase/mutations";
import type { BookingRequest, Customer, Employee } from "@/lib/types";

export function BookingRequestActions({
  request,
  customers,
  employees,
}: {
  request: BookingRequest;
  customers: Customer[];
  employees: Employee[];
}) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (request.status !== "pending") {
    return <span className="text-xs text-slate-400 capitalize">{request.status}</span>;
  }

  async function handleDecline(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await declineBookingRequest(request.id, String(formData.get("reason") ?? "") || undefined);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDeclining(false);
    router.refresh();
  }

  async function handleAccept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await acceptBookingRequest(request.id, {
      customerId: String(formData.get("customerId") ?? ""),
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? "") || undefined,
      durationMinutes: formData.get("durationMinutes")
        ? Number(formData.get("durationMinutes"))
        : undefined,
      employeeId: String(formData.get("employeeId") ?? "") || undefined,
      bay: String(formData.get("bay") ?? "") || undefined,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAcceptOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-1.5">
        {error && !declining && !acceptOpen ? <span className="text-xs text-rose-600">{error}</span> : null}
        <button
          type="button"
          onClick={() => setAcceptOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Check size={12} /> Accept
        </button>
        <button
          type="button"
          onClick={() => setDeclining((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
        >
          <X size={12} /> Decline
        </button>
      </div>

      {declining ? (
        <form onSubmit={handleDecline} className="mt-2 flex items-center justify-end gap-2">
          <input
            name="reason"
            placeholder="Reason (optional)"
            className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-accent-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
          </button>
        </form>
      ) : null}

      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept booking request"
        subtitle={`Create a booking for ${request.customerName}`}
        icon={CalendarClock}
        maxWidth="max-w-md"
      >
        <form className="space-y-5" onSubmit={handleAccept}>
          <FieldGroup label="Customer" htmlFor="customerId" required>
            <Select id="customerId" name="customerId" icon={User} required defaultValue="">
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <p className="text-xs text-slate-400">
            Can&apos;t find {request.customerName}? Add them as a customer first, then come back to accept
            this request.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldGroup label="Date" htmlFor="date" required>
              <TextInput
                id="date"
                name="date"
                type="date"
                icon={CalendarClock}
                required
                defaultValue={request.preferredDate ?? ""}
              />
            </FieldGroup>
            <FieldGroup label="Time" htmlFor="time">
              <TextInput
                id="time"
                name="time"
                type="time"
                icon={Clock}
                defaultValue={request.preferredTime ?? "09:00"}
              />
            </FieldGroup>
            <FieldGroup label="Duration (mins)" htmlFor="durationMinutes">
              <TextInput
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                icon={Timer}
                min="15"
                step="15"
                defaultValue="60"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Technician" htmlFor="employeeId">
            <Select id="employeeId" name="employeeId" defaultValue="">
              <option value="">Unassigned</option>
              {employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
            </Select>
          </FieldGroup>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setAcceptOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {busy ? "Booking..." : "Accept & book"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

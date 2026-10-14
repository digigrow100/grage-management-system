"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, PoundSterling, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { invoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import type { Booking, Customer, Invoice, Vehicle } from "@/lib/types";

const STORAGE_KEY = "garage_reminder_state_v1";
const CHECK_INTERVAL_MS = 60_000;
// A booking starts showing its reminder 30 minutes before it starts, and
// keeps showing (until snoozed/dismissed) for up to 3 hours after — long
// enough to matter, not so long it nags about jobs from days ago.
const BOOKING_LEAD_MS = 30 * 60_000;
const BOOKING_TRAIL_MS = 3 * 60 * 60_000;

const HOUR_MS = 60 * 60_000;

type ReminderKind = "booking" | "payment";

interface ReminderEntry {
  snoozedUntil?: number;
  dismissed?: boolean;
}
type ReminderState = Record<string, ReminderEntry>;

function loadState(): ReminderState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReminderState) : {};
  } catch {
    return {};
  }
}

function saveState(state: ReminderState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be unavailable (private mode, quota) — reminders
    // just won't persist snoozes across reloads, which is a fine fallback.
  }
}

interface ReminderItem {
  key: string;
  kind: ReminderKind;
  sortAt: number;
  booking?: Booking;
  invoice?: Invoice;
}

export function ReminderPopups({
  bookings,
  invoices,
  customers,
  vehicles,
}: {
  bookings: Booking[];
  invoices: Invoice[];
  customers: Customer[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const [state, setState] = useState<ReminderState>({});
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    function init() {
      setState(loadState());
      setNow(Date.now());
    }
    init();
    const interval = setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const candidates = useMemo<ReminderItem[]>(() => {
    if (now === null) return [];
    const items: ReminderItem[] = [];

    for (const b of bookings) {
      if (!b.startsAt) continue;
      if (b.status && b.status !== "confirmed") continue;
      const startMs = new Date(b.startsAt).getTime();
      if (Number.isNaN(startMs)) continue;
      if (startMs - now > BOOKING_LEAD_MS) continue;
      if (now - startMs > BOOKING_TRAIL_MS) continue;
      items.push({ key: `booking:${b.id}`, kind: "booking", sortAt: startMs, booking: b });
    }

    for (const inv of invoices) {
      if (inv.status !== "sent" && inv.status !== "overdue") continue;
      const dueMs = new Date(inv.dueDate).getTime();
      if (Number.isNaN(dueMs)) continue;
      if (inv.status !== "overdue" && dueMs > now) continue;
      items.push({ key: `invoice:${inv.id}`, kind: "payment", sortAt: dueMs, invoice: inv });
    }

    return items.sort((a, b) => a.sortAt - b.sortAt);
  }, [bookings, invoices, now]);

  const active = useMemo(
    () =>
      candidates.filter((item) => {
        const entry = state[item.key];
        if (!entry) return true;
        if (entry.dismissed) return false;
        if (entry.snoozedUntil && now !== null && entry.snoozedUntil > now) return false;
        return true;
      }),
    [candidates, state, now]
  );

  const current = active[0];

  function updateItem(key: string, entry: ReminderEntry) {
    setState((prev) => {
      const next = { ...prev, [key]: entry };
      saveState(next);
      return next;
    });
  }

  function snooze(key: string, ms: number) {
    updateItem(key, { snoozedUntil: Date.now() + ms });
  }

  function snoozeUntilTomorrow(key: string) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    updateItem(key, { snoozedUntil: d.getTime() });
  }

  function dismiss(key: string) {
    updateItem(key, { dismissed: true });
  }

  if (!current) return null;

  const customer = current.booking
    ? customerById.get(current.booking.customerId)
    : current.invoice
      ? customerById.get(current.invoice.customerId)
      : undefined;
  const vehicle = current.booking?.vehicleId
    ? vehicleById.get(current.booking.vehicleId)
    : current.invoice?.vehicleId
      ? vehicleById.get(current.invoice.vehicleId)
      : undefined;

  const minutesToStart =
    current.booking?.startsAt && now !== null
      ? Math.round((new Date(current.booking.startsAt).getTime() - now) / 60_000)
      : null;

  return (
    <Modal
      open
      onClose={() => snooze(current.key, HOUR_MS)}
      title={current.kind === "booking" ? "Upcoming booking" : "Payment reminder"}
      subtitle={customer?.name ?? "Unknown customer"}
      icon={current.kind === "booking" ? CalendarClock : PoundSterling}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {current.kind === "booking" && current.booking ? (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Vehicle</span>
              <span className="font-medium text-slate-900">
                {vehicle ? `${vehicle.registration} · ${vehicle.make ?? ""} ${vehicle.model ?? ""}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Job type</span>
              <Badge tone={JOB_TYPE_TONE[current.booking.jobType]}>
                {JOB_TYPE_LABELS[current.booking.jobType]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">
                {current.booking.time ?? "—"} · {formatDate(current.booking.date)}
              </span>
            </div>
            {minutesToStart !== null ? (
              <p className="pt-1 text-xs text-slate-500">
                {minutesToStart > 0
                  ? `Starts in ${minutesToStart} minute${minutesToStart === 1 ? "" : "s"}`
                  : minutesToStart === 0
                    ? "Starting now"
                    : `Started ${-minutesToStart} minute${-minutesToStart === 1 ? "" : "s"} ago`}
              </p>
            ) : null}
          </div>
        ) : null}

        {current.kind === "payment" && current.invoice ? (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Invoice</span>
              <span className="font-medium text-slate-900">{current.invoice.number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Amount due</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(invoiceTotals(current.invoice).total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Due date</span>
              <span className="font-medium text-slate-900">{formatDate(current.invoice.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <Badge tone={current.invoice.status === "overdue" ? "red" : "blue"} className="capitalize">
                {current.invoice.status}
              </Badge>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() =>
              router.push(current.kind === "booking" ? "/diary" : `/invoices/${current.invoice!.id}`)
            }
            className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
          >
            {current.kind === "booking" ? "View diary" : "Open invoice"}
          </button>
          <button
            type="button"
            onClick={() => snooze(current.key, HOUR_MS)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            1 hour
          </button>
          <button
            type="button"
            onClick={() => snooze(current.key, 2 * HOUR_MS)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            2 hours
          </button>
          <button
            type="button"
            onClick={() => snooze(current.key, 6 * HOUR_MS)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            6 hours
          </button>
          <button
            type="button"
            onClick={() => snoozeUntilTomorrow(current.key)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Next day
          </button>
          <button
            type="button"
            onClick={() => dismiss(current.key)}
            className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

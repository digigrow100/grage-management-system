"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteJobCard } from "@/lib/supabase/mutations";
import { jobLineTotal } from "@/lib/totals";
import { addMinutesToTime, formatCurrency, formatDateSlash } from "@/lib/format";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TONE,
  JOB_PRIORITY_LABELS,
  JOB_PRIORITY_TONE,
} from "@/lib/job-status";
import type { Booking, Customer, JobCard, Vehicle } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function JobsBoard({
  jobCards,
  customers,
  vehicles,
  bookings,
}: {
  jobCards: JobCard[];
  customers: Customer[];
  vehicles: Vehicle[];
  bookings: Booking[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );
  const bookingById = useMemo(
    () => new Map(bookings.map((b) => [b.id, b])),
    [bookings]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobCards.filter((job) => {
      if (term) {
        const customer = customerById.get(job.customerId);
        const vehicle = job.vehicleId ? vehicleById.get(job.vehicleId) : undefined;
        const haystack = [customer?.name, customer?.email, vehicle?.registration]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (fromDate && (!job.dueDate || job.dueDate < fromDate)) return false;
      if (toDate && (!job.dueDate || job.dueDate > toDate)) return false;
      return true;
    });
  }, [jobCards, search, fromDate, toDate, customerById, vehicleById]);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Search
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, email, or VRM..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                const today = todayIso();
                setFromDate(today);
                setToDate(today);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Today
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFromDate("");
                setToDate("");
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Clear
            </button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{filtered.length}</span> of{" "}
          <span className="font-medium text-slate-900">{jobCards.length}</span> jobs
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Schedule</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 text-right font-medium">Total Cost</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const customer = customerById.get(job.customerId);
                const vehicle = job.vehicleId ? vehicleById.get(job.vehicleId) : undefined;
                const booking = job.bookingId ? bookingById.get(job.bookingId) : undefined;
                const { total } = jobLineTotal(job);
                const itemsCount = job.labourLines.length + job.partLines.length;
                const vehicleDesc = [vehicle?.make, vehicle?.model]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={job.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium text-slate-900 hover:no-underline"
                      >
                        {vehicle?.registration ?? "No vehicle"}
                      </Link>
                      {vehicleDesc ? (
                        <p className="text-xs uppercase text-slate-400">{vehicleDesc}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{customer?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{customer?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      {job.dueDate ? (
                        <>
                          <p className="text-slate-900">{formatDateSlash(job.dueDate)}</p>
                          {booking?.time ? (
                            <p className="text-xs text-slate-400">
                              {booking.time}
                              {booking.durationMinutes
                                ? ` - ${addMinutesToTime(booking.time, booking.durationMinutes)}`
                                : ""}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={JOB_STATUS_TONE[job.status]}>
                        {JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={JOB_PRIORITY_TONE[job.priority]} className="uppercase">
                        {JOB_PRIORITY_LABELS[job.priority]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{itemsCount}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteButton
                        id={job.id}
                        action={deleteJobCard}
                        label="Delete job"
                        confirmMessage={`Delete this job for ${vehicle?.registration ?? "this vehicle"}? This cannot be undone.`}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-slate-400">
                    No jobs found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

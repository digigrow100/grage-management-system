"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  Wrench,
  ClipboardList,
  Clock3,
  PackageSearch,
  CircleCheck,
  UserRound,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteJobCard } from "@/lib/supabase/mutations";
import { jobLineTotal } from "@/lib/totals";
import {
  addMinutesToTime,
  formatCurrency,
  formatDateSlash,
} from "@/lib/format";
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
    [customers],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );
  const bookingById = useMemo(
    () => new Map(bookings.map((b) => [b.id, b])),
    [bookings],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobCards.filter((job) => {
      if (term) {
        const customer = customerById.get(job.customerId);
        const vehicle = job.vehicleId
          ? vehicleById.get(job.vehicleId)
          : undefined;
        const haystack = [
          customer?.name,
          customer?.email,
          vehicle?.registration,
        ]
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

  const working = jobCards.filter((job) =>
    ["checked_in", "in_progress", "authorised"].includes(job.status),
  ).length;
  const waiting = jobCards.filter((job) =>
    ["awaiting_parts", "awaiting_authorisation"].includes(job.status),
  ).length;
  const completed = jobCards.filter((job) =>
    ["completed", "vehicle_released", "invoiced"].includes(job.status),
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total job cards"
          value={String(jobCards.length)}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Work in progress"
          value={String(working)}
          icon={Wrench}
          tone="amber"
        />
        <StatCard
          label="Awaiting parts or approval"
          value={String(waiting)}
          icon={PackageSearch}
          tone="red"
        />
        <StatCard
          label="Completed jobs"
          value={String(completed)}
          icon={CircleCheck}
          tone="green"
        />
      </div>
      <Card className="rounded-2xl p-4 sm:p-5">
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
                type="search"
                aria-label="Search jobs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, email, or VRM..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              From Date
            </label>
            <input
              type="date"
              aria-label="Jobs due from date"
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
              aria-label="Jobs due to date"
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
          Showing{" "}
          <span className="font-medium text-slate-900">{filtered.length}</span>{" "}
          of{" "}
          <span className="font-medium text-slate-900">{jobCards.length}</span>{" "}
          jobs
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader
          title="Job card register"
          subtitle="Service details, schedules, and workshop progress"
          icon={Wrench}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
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
                const vehicle = job.vehicleId
                  ? vehicleById.get(job.vehicleId)
                  : undefined;
                const booking = job.bookingId
                  ? bookingById.get(job.bookingId)
                  : undefined;
                const { total } = jobLineTotal(job);
                const itemsCount =
                  job.labourLines.length + job.partLines.length;
                const vehicleDesc = [vehicle?.make, vehicle?.model]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={job.id}
                    tabIndex={0}
                    aria-label={`Open job for ${vehicle?.registration ?? customer?.name ?? "unassigned vehicle"}`}
                    onClick={(event) => {
                      if (
                        (event.target as HTMLElement).closest(
                          "a, button, input, select, textarea",
                        )
                      )
                        return;
                      router.push(`/jobs/${job.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/jobs/${job.id}`);
                      }
                    }}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent-600"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-block whitespace-nowrap rounded-md border border-amber-200 bg-amber-100 px-2 py-1 font-bold tracking-wide text-slate-900"
                      >
                        {vehicle?.registration ?? "No vehicle"}
                      </Link>
                      {vehicleDesc ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {vehicleDesc}
                        </p>
                      ) : null}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <Wrench size={13} className="shrink-0" />
                        {job.description || "Untitled job"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">
                        {customer?.name ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {customer?.email}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <UserRound size={13} />
                        {job.technician || "Unassigned"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {job.dueDate ? (
                        <>
                          <p className="text-slate-900">
                            {formatDateSlash(job.dueDate)}
                          </p>
                          {booking?.time ? (
                            <p className="text-xs text-slate-400">
                              <Clock3 size={12} className="mr-1 inline" />
                              {booking.time.slice(0, 5)}
                              {booking.durationMinutes
                                ? ` - ${addMinutesToTime(booking.time.slice(0, 5), booking.durationMinutes)}`
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
                      <Badge
                        tone={JOB_PRIORITY_TONE[job.priority]}
                        className="uppercase"
                      >
                        {JOB_PRIORITY_LABELS[job.priority]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{itemsCount}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
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
                  <td
                    colSpan={8}
                    className="px-5 py-6 text-center text-sm text-slate-400"
                  >
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

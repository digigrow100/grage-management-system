"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Car,
  Clock3,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { usePermission } from "@/components/layout/PermissionContext";
import { deleteBooking } from "@/lib/supabase/mutations";
import { addMinutesToTime, formatCurrency } from "@/lib/format";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import { JOB_STATUS_LABELS } from "@/lib/job-status";
import { formatServiceDetailsSummary } from "@/lib/service-fields";
import type { Booking, Customer, JobStatus, Vehicle } from "@/lib/types";

const borderColour = {
  neutral: "border-l-slate-400",
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  red: "border-l-rose-500",
  purple: "border-l-violet-500",
};

export function BookingCard({
  booking,
  customer,
  vehicle,
  dateLabel,
  jobStatus,
}: {
  booking: Booking;
  customer?: Pick<Customer, "name" | "email" | "phone">;
  vehicle?: Pick<Vehicle, "registration" | "make" | "model">;
  dateLabel: string;
  jobStatus?: JobStatus;
}) {
  const [open, setOpen] = useState(false);
  const can = usePermission();
  const service = JOB_TYPE_LABELS[booking.jobType],
    tone = JOB_TYPE_TONE[booking.jobType];
  const name = customer?.name ?? "Unknown customer";
  const time = booking.time?.slice(0, 5);
  const duration = booking.durationMinutes;
  const timeRange =
    time && duration
      ? `${time} – ${addMinutesToTime(time, duration)}`
      : (time ?? "Time not set");
  const summary = formatServiceDetailsSummary(booking.serviceDetails);
  const details = [
    { label: "Date", value: dateLabel, icon: CalendarDays },
    { label: "Time", value: timeRange, icon: Clock3 },
    {
      label: "Duration",
      value: duration ? `${duration} minutes` : "Not set",
      icon: Clock3,
    },
    {
      label: "Technician",
      value: booking.technician || "Not assigned",
      icon: UserRound,
    },
    { label: "Bay", value: booking.bay || "Not assigned", icon: MapPin },
    {
      label: "Estimated price",
      value:
        booking.estPrice != null ? formatCurrency(booking.estPrice) : "Not set",
      icon: Wrench,
    },
  ];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${service} booking for ${name}`}
        className={`group block w-full rounded-xl border border-slate-200 border-l-4 ${borderColour[tone]} bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-900">
            <Clock3 size={14} className="text-slate-400" aria-hidden="true" />
            {time ?? "Time not set"}
          </span>
          {duration ? (
            <span className="text-xs text-slate-500">{duration} min</span>
          ) : null}
        </span>
        <span className="mt-3 block">
          <Badge tone={tone}>{service}</Badge>
        </span>
        <span className="mt-2 block text-sm font-semibold leading-5 text-slate-900">
          {name}
        </span>
        <span className="mt-2 flex items-center gap-2 text-xs">
          <Car
            size={15}
            className="shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold tracking-wide text-slate-700">
            {vehicle?.registration ?? "No vehicle assigned"}
          </span>
        </span>
        <span className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="min-w-0 space-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <UserRound size={13} className="shrink-0" aria-hidden="true" />
              <span className="truncate">
                {booking.technician || "Technician unassigned"}
              </span>
            </span>
            {booking.bay ? (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" />
                {booking.bay}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[10px] uppercase tracking-wide text-slate-400">
              Estimate
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.estPrice != null
                ? formatCurrency(booking.estPrice)
                : "—"}
            </span>
          </span>
        </span>
        <span className="mt-3 flex items-center justify-between text-[11px] font-medium text-accent-600">
          Booking details
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Booking details"
        subtitle={`${service} · ${dateLabel}`}
        icon={CalendarDays}
      >
        <div className="space-y-5">
          <section className="rounded-xl border border-blue-100 bg-accent-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={tone}>{service}</Badge>
              {jobStatus ? (
                <span className="text-xs font-medium text-slate-600">
                  {JOB_STATUS_LABELS[jobStatus]}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {name}
            </h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Car size={16} aria-hidden="true" />
              {vehicle?.registration ?? "No vehicle assigned"}
              {vehicle?.make || vehicle?.model
                ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}`
                : ""}
            </p>
            {customer?.phone || customer?.email ? (
              <p className="mt-3 break-words text-xs leading-5 text-slate-500">
                {[customer?.phone, customer?.email].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </section>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {details.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-100 p-3"
              >
                <dt className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {summary ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">
                Service information
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                {summary}
              </p>
            </section>
          ) : null}
          {booking.notes ? (
            <section className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                {booking.notes}
              </p>
            </section>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {can("customers.manage", "customers.view") ? (
              <Link
                href={`/customers/${booking.customerId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700"
              >
                Open customer details
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Close
              </button>
            )}
            {can("bookings.manage") ? (
              <DeleteButton
                id={booking.id}
                action={deleteBooking}
                label="Delete booking"
                confirmMessage={`Delete this booking for ${name}? This cannot be undone.`}
              />
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

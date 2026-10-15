"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, MapPin, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { deleteBooking } from "@/lib/supabase/mutations";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import { formatCurrency } from "@/lib/format";
import { formatServiceDetailsSummary } from "@/lib/service-fields";
import { cn } from "@/lib/cn";
import type { Booking, Customer, JobCard, Vehicle } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The strip renders a single continuous range of days — today minus/plus
// this many, by default — so cursor-drag alone can reach every date with
// no "wall" to hit. If any booking falls outside that default range, the
// range is widened to include it, so every real booking stays reachable.
// MAX_SPAN_DAYS is only a defensive outer bound against a corrupted date
// (e.g. a bad year) blowing up the render — it's far beyond any realistic
// booking history/lead time, so it should never clip an actual booking.
const DEFAULT_PAST_DAYS = 14;
const DEFAULT_FUTURE_DAYS = 60;
const MAX_SPAN_DAYS = 3650;
const CARD_WIDTH = 288; // w-72
const GAP = 16; // gap-4
const JUMP_DAYS = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayWindow(startIso: string, count: number) {
  const days: { date: string; weekday: string; dayNum: number; month: string }[] = [];
  for (let i = 0; i < count; i++) {
    const iso = addDaysIso(startIso, i);
    const d = new Date(`${iso}T00:00:00Z`);
    days.push({
      date: iso,
      weekday: DAY_NAMES[d.getUTCDay()],
      dayNum: d.getUTCDate(),
      month: MONTH_NAMES[d.getUTCMonth()],
    });
  }
  return days;
}

export function DiaryBoard({
  bookings,
  customers,
  vehicles,
  jobCards,
  headerAction,
}: {
  bookings: Booking[];
  customers: Customer[];
  vehicles: Vehicle[];
  jobCards: JobCard[];
  headerAction?: React.ReactNode;
}) {
  const router = useRouter();
  const today = useMemo(() => todayIso(), []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const jobIdByBookingId = useMemo(
    () => new Map(jobCards.filter((j) => j.bookingId).map((j) => [j.bookingId as string, j.id])),
    [jobCards]
  );

  // One continuous range covering today ± a default buffer, widened to
  // include any booking that falls outside it (clamped to a sane max span)
  // so every booking is reachable by scrolling — no separate "pages".
  const days = useMemo(() => {
    let start = addDaysIso(today, -DEFAULT_PAST_DAYS);
    let end = addDaysIso(today, DEFAULT_FUTURE_DAYS);
    for (const b of bookings) {
      if (!b.date) continue;
      if (b.date < start) start = b.date;
      if (b.date > end) end = b.date;
    }
    const hardMin = addDaysIso(today, -MAX_SPAN_DAYS);
    const hardMax = addDaysIso(today, MAX_SPAN_DAYS);
    if (start < hardMin) start = hardMin;
    if (end > hardMax) end = hardMax;
    const totalDays =
      Math.round(
        (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
          86_400_000
      ) + 1;
    return dayWindow(start, totalDays);
  }, [bookings, today]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  // Center the strip on today as soon as it mounts, instead of starting
  // at the very first (potentially weeks-old) rendered day.
  useEffect(() => {
    const el = scrollRef.current;
    const card = el?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    card?.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
  }, [today]);

  function onDragStart(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false };
  }
  function onDragMove(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el || !drag.current.down) return;
    e.preventDefault();
    const delta = e.pageX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - delta;
  }
  function onDragEnd() {
    drag.current.down = false;
  }
  function onCardClick(href: string) {
    if (drag.current.moved) return;
    router.push(href);
  }
  function scrollByDays(count: number) {
    scrollRef.current?.scrollBy({ left: count * (CARD_WIDTH + GAP), behavior: "smooth" });
  }
  function scrollToToday() {
    const el = scrollRef.current;
    const card = el?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByDays(-JUMP_DAYS)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={scrollToToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => scrollByDays(JUMP_DAYS)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {headerAction}
      </div>

      <div
        ref={scrollRef}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        className="scrollbar-hide flex cursor-grab select-none gap-4 overflow-x-auto pb-2 active:cursor-grabbing"
      >
        {days.map((day) => {
          const isToday = day.date === today;
          const dayBookings = bookings
            .filter((b) => b.date === day.date)
            .sort((a, b) => {
              if (a.startsAt && b.startsAt) return a.startsAt.localeCompare(b.startsAt);
              return (a.time ?? "").localeCompare(b.time ?? "");
            });

          return (
            <div
              key={day.date}
              data-date={day.date}
              className={cn(
                "flex w-72 shrink-0 select-none flex-col rounded-xl border bg-white shadow-sm",
                isToday ? "border-accent-700 ring-1 ring-accent-700" : "border-slate-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-xl px-4 py-3",
                  isToday ? "bg-accent-700 text-white" : "border-b border-slate-100"
                )}
              >
                <div>
                  <p className={cn("text-sm font-semibold", isToday ? "text-white" : "text-slate-900")}>
                    {day.weekday} {day.dayNum} {day.month}
                  </p>
                  <p className={cn("text-xs", isToday ? "text-white/80" : "text-slate-500")}>
                    {isToday ? "Today" : `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {isToday ? (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                    {dayBookings.length}
                  </span>
                ) : null}
              </div>

              <div className="flex-1 space-y-2.5 p-3">
                {dayBookings.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">No bookings</p>
                ) : (
                  dayBookings.map((b) => {
                    const customer = customerById.get(b.customerId);
                    const vehicle = b.vehicleId ? vehicleById.get(b.vehicleId) : undefined;
                    const jobId = jobIdByBookingId.get(b.id);
                    const assignment = [b.bay, b.technician].filter(Boolean).join(" · ");
                    const tone = JOB_TYPE_TONE[b.jobType];

                    return (
                      <div
                        key={b.id}
                        onClick={() => jobId && onCardClick(`/jobs/${jobId}`)}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50/60 pl-3 pr-2.5 py-2.5 transition-all hover:border-accent-200 hover:bg-white hover:shadow-md",
                          jobId ? "cursor-pointer" : ""
                        )}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1",
                            tone === "blue" && "bg-blue-500",
                            tone === "green" && "bg-emerald-500",
                            tone === "amber" && "bg-amber-500",
                            tone === "red" && "bg-rose-500",
                            tone === "purple" && "bg-violet-500",
                            tone === "neutral" && "bg-slate-400"
                          )}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={tone} className="text-[10px]">
                            {JOB_TYPE_LABELS[b.jobType]}
                          </Badge>
                          {b.time ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                              <Clock size={11} className="text-slate-400" />
                              {b.time.slice(0, 5)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
                          {customer?.name ?? "Unknown customer"}
                        </p>
                        {vehicle ? (
                          <p className="truncate text-xs text-slate-500">{vehicle.registration}</p>
                        ) : null}
                        {b.estPrice != null ? (
                          <p className="mt-1 text-xs font-semibold text-accent-700">
                            {formatCurrency(b.estPrice)}
                          </p>
                        ) : null}
                        {formatServiceDetailsSummary(b.serviceDetails) ? (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {formatServiceDetailsSummary(b.serviceDetails)}
                          </p>
                        ) : null}
                        {b.locationType && b.locationType !== "garage" ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                            <MapPin size={11} />
                            Off-site{b.addressLine ? ` · ${b.addressLine}` : ""}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2">
                          <span className="truncate text-[11px] text-slate-400">
                            {assignment || "Unassigned"}
                          </span>
                          <div className="flex items-center gap-1">
                            {jobId ? (
                              <span className="flex items-center gap-0.5 text-[11px] font-medium text-accent-600">
                                <Wrench size={11} />
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (
                                  !window.confirm(
                                    `Delete this booking for ${customer?.name ?? "this customer"}? This cannot be undone.`
                                  )
                                ) {
                                  return;
                                }
                                await deleteBooking(b.id);
                                router.refresh();
                              }}
                              aria-label="Delete booking"
                              className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

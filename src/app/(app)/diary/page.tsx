import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClickableCard, StopPropagation } from "@/components/ui/Clickable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  getActiveCustomers,
  getBookings,
  getCustomers,
  getEmployees,
  getJobCards,
  getVehicles,
} from "@/lib/supabase/queries";
import { deleteBooking } from "@/lib/supabase/mutations";
import { BookJobButton } from "@/components/forms/BookJobModal";
import { JOB_TYPE_LABELS, JOB_TYPE_TONE } from "@/lib/job-types";
import { formatCurrency } from "@/lib/format";
import { formatServiceDetailsSummary } from "@/lib/service-fields";

const WINDOW_SIZE = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayWindow(startIso: string, count: number) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const days: { date: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const iso = addDaysIso(startIso, i);
    const d = new Date(`${iso}T00:00:00Z`);
    days.push({
      date: iso,
      label: `${dayNames[d.getUTCDay()]} ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`,
    });
  }
  return days;
}

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const startIso = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : todayIso();

  const [bookings, customers, activeCustomers, vehicles, jobCards, employees] =
    await Promise.all([
      getBookings(),
      getCustomers(),
      getActiveCustomers(),
      getVehicles(),
      getJobCards(),
      getEmployees(),
    ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const jobIdByBookingId = new Map(
    jobCards.filter((j) => j.bookingId).map((j) => [j.bookingId as string, j.id])
  );
  const days = dayWindow(startIso, WINDOW_SIZE);
  const prevStart = addDaysIso(startIso, -WINDOW_SIZE);
  const nextStart = addDaysIso(startIso, WINDOW_SIZE);

  return (
    <>
      <TopBar
        title="Bookings"
        subtitle="Upcoming booking calendar across bays and technicians"
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/diary?start=${prevStart}`}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={15} />
            </Link>
            <Link
              href="/diary"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              Today
            </Link>
            <Link
              href={`/diary?start=${nextStart}`}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
          <BookJobButton customers={activeCustomers} employees={employees} />
        </div>
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
          {days.map((day) => {
            const dayBookings = bookings
              .filter((b) => b.date === day.date)
              .sort((a, b) => {
                if (a.startsAt && b.startsAt) return a.startsAt.localeCompare(b.startsAt);
                return (a.time ?? "").localeCompare(b.time ?? "");
              });
            return (
              <Card key={day.date} className="flex w-72 shrink-0 flex-col">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {day.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dayBookings.length} booking
                    {dayBookings.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex-1 space-y-2 p-3">
                  {dayBookings.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-slate-400">
                      No bookings
                    </p>
                  ) : (
                    dayBookings.map((b) => {
                      const customer = customerById.get(b.customerId);
                      const vehicle = b.vehicleId
                        ? vehicleById.get(b.vehicleId)
                        : undefined;
                      const jobId = jobIdByBookingId.get(b.id);
                      const assignment = [b.bay, b.technician].filter(Boolean).join(" · ");
                      const cardBody = (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone={JOB_TYPE_TONE[b.jobType]}>
                              {JOB_TYPE_LABELS[b.jobType]}
                            </Badge>
                            {b.time ? (
                              <span className="text-xs font-semibold text-slate-900">
                                {b.time}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-900">
                            {customer?.name ?? "Unknown customer"}
                          </p>
                          {vehicle ? (
                            <p className="text-xs text-slate-500">
                              {vehicle.registration}
                            </p>
                          ) : null}
                          {b.estPrice != null ? (
                            <p className="mt-1 text-xs font-medium text-slate-700">
                              Est. {formatCurrency(b.estPrice)}
                            </p>
                          ) : null}
                          {formatServiceDetailsSummary(b.serviceDetails) ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {formatServiceDetailsSummary(b.serviceDetails)}
                            </p>
                          ) : null}
                          {b.notes ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {b.notes}
                            </p>
                          ) : null}
                          {b.locationType && b.locationType !== "garage" ? (
                            <Badge tone="blue" className="mt-1.5">
                              Off-site{b.addressLine ? ` · ${b.addressLine}` : ""}
                            </Badge>
                          ) : null}
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {assignment || "Unassigned"}
                            </span>
                            <div className="flex items-center gap-2">
                              {jobId ? (
                                <span className="text-xs font-medium text-accent-600">
                                  View job →
                                </span>
                              ) : null}
                              <StopPropagation>
                                <DeleteButton
                                  id={b.id}
                                  action={deleteBooking}
                                  label="Delete booking"
                                  confirmMessage={`Delete this booking for ${customer?.name ?? "this customer"}? This cannot be undone.`}
                                />
                              </StopPropagation>
                            </div>
                          </div>
                        </>
                      );

                      return jobId ? (
                        <ClickableCard
                          key={b.id}
                          href={`/jobs/${jobId}`}
                          className="rounded-lg border border-slate-100 p-2.5 transition-colors hover:bg-slate-50"
                        >
                          {cardBody}
                        </ClickableCard>
                      ) : (
                        <div key={b.id} className="rounded-lg border border-slate-100 p-2.5">
                          {cardBody}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}

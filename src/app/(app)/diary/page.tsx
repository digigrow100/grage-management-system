import { BookingCalendar } from "@/components/bookings/BookingCalendar";
import { BookingCard } from "@/components/bookings/BookingCard";
import {
  bookingCalendarDays,
  CALENDAR_DAYS,
  isCalendarDate,
  shiftCalendarDate,
  workshopToday,
} from "@/lib/booking-calendar";
import { requirePermission } from "@/lib/supabase/permissions";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import {
  getGarageSettings,
  getActiveCustomers,
  getBookings,
  getCustomers,
  getEmployees,
  getJobCards,
  getVehicles,
} from "@/lib/supabase/queries";
import { BookJobButton } from "@/components/forms/BookJobModal";

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  await requirePermission("bookings.manage", "bookings.view");
  const [
    bookings,
    customers,
    activeCustomers,
    vehicles,
    jobCards,
    employees,
    settings,
    query,
  ] = await Promise.all([
    getBookings(),
    getCustomers(),
    getActiveCustomers(),
    getVehicles(),
    getJobCards(),
    getEmployees(),
    getGarageSettings(),
    searchParams,
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const jobByBookingId = new Map(
    jobCards.filter((j) => j.bookingId).map((j) => [j.bookingId as string, j]),
  );
  const today = workshopToday(settings.timezone);
  const startDate =
    typeof query.date === "string" && isCalendarDate(query.date)
      ? query.date
      : today;
  const days = bookingCalendarDays(shiftCalendarDate(startDate, -CALENDAR_DAYS), CALENDAR_DAYS * 4);
  const previousDate = shiftCalendarDate(startDate, -CALENDAR_DAYS);
  const nextDate = shiftCalendarDate(startDate, CALENDAR_DAYS);

  return (
    <>
      <TopBar
        title="Bookings"
        subtitle={`${days[0].label} ${days[0].date.slice(0, 4)} – ${days[days.length - 1].label} ${days[days.length - 1].date.slice(0, 4)} · ${settings.timezone}`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Booking calendar dates"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <Link
              href={`/diary?date=${previousDate}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              ← Previous 5 days
            </Link>
            <Link
              href={`/diary?date=${today}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              Today
            </Link>
            <Link
              href={`/diary?date=${nextDate}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              Next 5 days →
            </Link>
            <form action="/diary" className="flex items-center gap-2">
              <label htmlFor="calendar-date" className="sr-only">
                Calendar start date
              </label>
              <input
                key={startDate}
                id="calendar-date"
                type="date"
                name="date"
                defaultValue={startDate}
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                Go
              </button>
            </form>
          </nav>
          <BookJobButton
            customers={activeCustomers}
            employees={employees}
            vehicles={vehicles}
            initialDate={startDate}
          />
        </div>
        <p className="text-xs text-slate-500">
          Earlier days are above on mobile; upcoming days are below. On larger
          screens, scroll sideways for more dates.
        </p>
        <BookingCalendar selectedDate={startDate}>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-flow-col md:auto-cols-[310px] md:grid-cols-none">
            {days.map((day) => {
              const dayBookings = bookings
                .filter((b) => b.date === day.date)
                .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
              return (
                <section
                  data-calendar-date={day.date}
                  key={day.date}
                  className={`overflow-hidden rounded-2xl border shadow-sm ${day.date === today ? "booking-calendar-today" : "border-slate-200 bg-slate-50"}`}
                >
                  <div
                    className={`shrink-0 border-b px-4 py-3 ${day.date === today ? "border-white/15 bg-white/5" : "border-slate-100"}`}
                  >
                    <p className={day.date === today ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>
                      {day.label}
                      {day.date === today ? (
                        <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Today
                        </span>
                      ) : null}
                    </p>
                    <p className={day.date === today ? "mt-1 text-xs text-blue-200" : "mt-1 text-xs text-slate-500"}>
                      {dayBookings.length} booking
                      {dayBookings.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div
                    role="region"
                    aria-label={`Bookings for ${day.label}`}
                    className="space-y-3 p-3"
                  >
                    {dayBookings.length === 0 ? (
                      <p className={day.date === today ? "px-2 py-8 text-center text-xs text-blue-200" : "px-2 py-8 text-center text-xs text-slate-400"}>
                        No bookings
                      </p>
                    ) : (
                      dayBookings.map((b) => {
                        const customer = customerById.get(b.customerId);
                        const vehicle = b.vehicleId
                          ? vehicleById.get(b.vehicleId)
                          : undefined;
                        const job = jobByBookingId.get(b.id);
                        return (
                          <BookingCard
                            key={b.id}
                            booking={b}
                            customer={
                              customer
                                ? {
                                    name: customer.name,
                                    email: customer.email,
                                    phone: customer.phone,
                                  }
                                : undefined
                            }
                            vehicle={
                              vehicle
                                ? {
                                    registration: vehicle.registration,
                                    make: vehicle.make,
                                    model: vehicle.model,
                                  }
                                : undefined
                            }
                            dateLabel={`${day.label} ${day.date.slice(0, 4)}`}
                            jobStatus={job?.status}
                          />
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </BookingCalendar>
      </main>
    </>
  );
}

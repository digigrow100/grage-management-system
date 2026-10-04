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
import { Card } from "@/components/ui/Card";
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
  const days = bookingCalendarDays(startDate, CALENDAR_DAYS * 3);
  const previousDate = shiftCalendarDate(startDate, -CALENDAR_DAYS);
  const nextDate = shiftCalendarDate(startDate, CALENDAR_DAYS);

  return (
    <>
      <TopBar
        title="Bookings"
        subtitle={`${days[0].label} ${startDate.slice(0, 4)} – ${days[days.length - 1].label} ${days[days.length - 1].date.slice(0, 4)} · ${settings.timezone}`}
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
          Scroll sideways for more dates. Scroll inside a day to see more
          bookings.
        </p>
        <div
          role="region"
          aria-label="Scrollable booking calendar"
          tabIndex={0}
          className="booking-calendar-scroll max-w-full overflow-x-auto rounded-xl pb-3 focus-visible:outline-2 focus-visible:outline-accent-500"
        >
          <div className="grid grid-flow-col auto-cols-[280px] gap-4">
            {days.map((day) => {
              const dayBookings = bookings
                .filter((b) => b.date === day.date)
                .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
              return (
                <Card
                  key={day.date}
                  className={`flex h-[65vh] min-h-[320px] max-h-[640px] flex-col ${day.date === today ? "booking-calendar-today ring-1 ring-blue-200" : ""}`}
                >
                  <div
                    className={`shrink-0 border-b px-4 py-3 ${day.date === today ? "border-blue-200 bg-blue-100/60" : "border-slate-100"}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {day.label}
                      {day.date === today ? (
                        <span className="ml-2 rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Today
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dayBookings.length} booking
                      {dayBookings.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div
                    role="region"
                    aria-label={`Bookings for ${day.label}`}
                    tabIndex={0}
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 focus-visible:outline-2 focus-visible:outline-accent-500"
                  >
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
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

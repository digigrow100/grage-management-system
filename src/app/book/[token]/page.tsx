import { getBookingWidgetInfoByToken } from "@/lib/supabase/mutations";
import { BookingRequestForm } from "@/components/booking-requests/BookingRequestForm";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const widget = await getBookingWidgetInfoByToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {!widget ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">This link isn&apos;t available</p>
            <p className="mt-1 text-sm text-slate-500">
              Please check the link or contact the garage directly to book.
            </p>
          </div>
        ) : !widget.enabled ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">
              {widget.garageName} isn&apos;t taking online bookings right now
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Please contact the garage directly to book your vehicle in.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-accent-600">
              {widget.garageName}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Request a booking</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tell us a bit about what you need and we&apos;ll get back to you to confirm a time.
            </p>
            <div className="mt-6">
              <BookingRequestForm token={token} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

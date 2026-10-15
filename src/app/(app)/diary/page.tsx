import { TopBar } from "@/components/layout/TopBar";
import { DiaryBoard } from "@/components/diary/DiaryBoard";
import {
  getActiveCustomers,
  getBookings,
  getCustomers,
  getEmployees,
  getGarageSettings,
  getJobCards,
  getParts,
  getVehicles,
} from "@/lib/supabase/queries";
import { BookJobButton } from "@/components/forms/BookJobModal";

export default async function DiaryPage() {
  const [bookings, customers, activeCustomers, vehicles, jobCards, employees, parts, garage] =
    await Promise.all([
      getBookings(),
      getCustomers(),
      getActiveCustomers(),
      getVehicles(),
      getJobCards(),
      getEmployees(),
      getParts(),
      getGarageSettings(),
    ]);

  return (
    <>
      <TopBar
        title="Bookings"
        subtitle="Upcoming booking calendar across bays and technicians"
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <DiaryBoard
          bookings={bookings}
          customers={customers}
          vehicles={vehicles}
          jobCards={jobCards}
          headerAction={
            <BookJobButton
              customers={activeCustomers}
              employees={employees}
              parts={parts}
              defaultVatRate={garage.defaultVatRate}
            />
          }
        />
      </main>
    </>
  );
}

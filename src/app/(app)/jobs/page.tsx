import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import {
  getBookings,
  getCustomers,
  getJobCards,
  getVehicles,
} from "@/lib/supabase/queries";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export default async function JobsPage() {
  await requirePermission("jobs.manage", "jobs.view", "jobs.update");
  const [jobCards, customers, vehicles, bookings] = await Promise.all([
    getJobCards(),
    getCustomers(),
    getVehicles(),
    getBookings(),
  ]);

  return (
    <>
      <TopBar title="Jobs" subtitle="Manage and track all service jobs" />
      <main className="flex-1 overflow-x-auto p-4 sm:p-6">
        <JobsBoard
          jobCards={jobCards}
          customers={customers}
          vehicles={vehicles}
          bookings={bookings}
        />
      </main>
    </>
  );
}

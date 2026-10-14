import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { NavDrawerProvider } from "@/components/layout/NavDrawerContext";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { UserProvider } from "@/components/layout/UserContext";
import { GarageProvider } from "@/components/layout/GarageContext";
import { CreateFirstGarage } from "@/components/layout/CreateFirstGarage";
import { ReminderPopups } from "@/components/reminders/ReminderPopups";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarageId, getUserGarages } from "@/lib/supabase/garage";
import { getBookings, getCustomers, getInvoices, getVehicles } from "@/lib/supabase/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const garages = await getUserGarages();

  if (garages.length === 0) {
    return <CreateFirstGarage />;
  }

  const currentGarageId = await getCurrentGarageId();
  const [bookings, invoices, customers, vehicles] = await Promise.all([
    getBookings(),
    getInvoices(),
    getCustomers(),
    getVehicles(),
  ]);

  return (
    <UserProvider email={user.email ?? "Signed in"}>
      <GarageProvider garages={garages} currentGarageId={currentGarageId}>
        <NavDrawerProvider>
          <Sidebar />
          <MobileNavDrawer />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          <ReminderPopups
            bookings={bookings}
            invoices={invoices}
            customers={customers}
            vehicles={vehicles}
          />
        </NavDrawerProvider>
      </GarageProvider>
    </UserProvider>
  );
}

import { getPermissions } from "@/lib/supabase/permissions";
import { PermissionProvider } from "@/components/layout/PermissionContext";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { NavDrawerProvider } from "@/components/layout/NavDrawerContext";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { UserProvider } from "@/components/layout/UserContext";
import { GarageProvider } from "@/components/layout/GarageContext";
import { CreateFirstGarage } from "@/components/layout/CreateFirstGarage";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarageId, getUserGarages } from "@/lib/supabase/garage";

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

  return (
    <PermissionProvider permissions={await getPermissions()}>
    <UserProvider email={user.email ?? "Signed in"}>
      <GarageProvider garages={garages} currentGarageId={currentGarageId}>
        <NavDrawerProvider>
          <Sidebar />
          <MobileNavDrawer />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </NavDrawerProvider>
      </GarageProvider>
    </UserProvider>
    </PermissionProvider>
  );
}

import { TopBar } from "@/components/layout/TopBar";
import {
  getGarageClosures,
  getGarageOpeningHours,
  getGarageSettings,
  getServiceCatalogue,
} from "@/lib/supabase/queries";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { OpeningHoursEditor } from "@/components/forms/OpeningHoursEditor";
import { ClosuresManager } from "@/components/forms/ClosuresManager";
import { CalendarSettingsForm } from "@/components/forms/CalendarSettingsForm";
import { ServiceCatalogueEditor } from "@/components/forms/ServiceCatalogueEditor";

export default async function SettingsPage() {
  const [settings, openingHours, closures, services] = await Promise.all([
    getGarageSettings(),
    getGarageOpeningHours(),
    getGarageClosures(),
    getServiceCatalogue(),
  ]);

  return (
    <>
      <TopBar title="Settings" subtitle="Garage profile, hours and defaults" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <SettingsForm settings={settings} />
          <OpeningHoursEditor openingHours={openingHours} />
          <ClosuresManager closures={closures} />
          <CalendarSettingsForm settings={settings} />
          <ServiceCatalogueEditor services={services} />
        </div>
      </main>
    </>
  );
}

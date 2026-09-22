import { TopBar } from "@/components/layout/TopBar";
import {
  getGarageClosures,
  getGarageOpeningHours,
  getGarageSettings,
  getReminderSettings,
  getServiceCatalogue,
  getVhcTemplates,
} from "@/lib/supabase/queries";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { OpeningHoursEditor } from "@/components/forms/OpeningHoursEditor";
import { ClosuresManager } from "@/components/forms/ClosuresManager";
import { CalendarSettingsForm } from "@/components/forms/CalendarSettingsForm";
import { ServiceCatalogueEditor } from "@/components/forms/ServiceCatalogueEditor";
import { ReminderSettingsForm } from "@/components/forms/ReminderSettingsForm";
import { VhcTemplateEditor } from "@/components/forms/VhcTemplateEditor";

export default async function SettingsPage() {
  const [settings, openingHours, closures, services, reminderSettings, vhcTemplates] = await Promise.all([
    getGarageSettings(),
    getGarageOpeningHours(),
    getGarageClosures(),
    getServiceCatalogue(),
    getReminderSettings(),
    getVhcTemplates(),
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
          <VhcTemplateEditor templates={vhcTemplates} />
          <ReminderSettingsForm settings={reminderSettings} />
        </div>
      </main>
    </>
  );
}

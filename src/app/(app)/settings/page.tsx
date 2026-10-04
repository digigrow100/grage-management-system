import { requirePermission, getPermissions } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { getGarageSettings } from "@/lib/supabase/queries";
import { getTeamManagementData } from "@/lib/supabase/team-actions";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { TeamRolesSettings } from "@/components/forms/TeamRolesSettings";

export default async function SettingsPage() {
  await requirePermission("settings.manage", "team.manage");
  const permissions = await getPermissions();
  const [settings, teamData] = await Promise.all([
    getGarageSettings(),
    getTeamManagementData(),
  ]);

  return (
    <>
      <TopBar title="Settings" subtitle="Garage profile, team members, roles and permissions" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {(permissions.includes("*") || permissions.includes("settings.manage")) ? <SettingsForm settings={settings} /> : null}
          <TeamRolesSettings data={teamData} />
        </div>
      </main>
    </>
  );
}

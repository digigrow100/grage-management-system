import { TopBar } from "@/components/layout/TopBar";
import { TeamRolesSettings } from "@/components/forms/TeamRolesSettings";
import { getTeamManagementData } from "@/lib/supabase/team-actions";

export default async function TeamPage() {
  const teamData = await getTeamManagementData();

  return (
    <>
      <TopBar
        title="Team & Roles"
        subtitle="Manage users, roles and permissions"
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <TeamRolesSettings data={teamData} />
        </div>
      </main>
    </>
  );
}

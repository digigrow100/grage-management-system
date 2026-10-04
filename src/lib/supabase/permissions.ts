import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import { getCurrentGarageId } from "./garage";

export const getPermissions = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_garage_permissions", {
    p_garage: await getCurrentGarageId(),
  });
  if (error) throw new Error("Could not check your permissions.");
  return data ?? [];
});
export async function requirePermission(...permissions: string[]) {
  const allowed = await getPermissions();
  if (!allowed.includes("*") && !permissions.some((p) => allowed.includes(p)))
    redirect("/access-denied");
}

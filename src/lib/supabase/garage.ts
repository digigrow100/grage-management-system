import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./server";
import type { Garage, GarageRole } from "@/lib/types";

export const GARAGE_COOKIE = "garage_id";

/**
 * All garages the signed-in user belongs to. Memoized per request so the
 * many query/mutation helpers that each need the current garage don't fan
 * out into duplicate round-trips within the same render.
 */
export const getUserGarages = cache(async (): Promise<Garage[]> => {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("garage_members")
    .select("garage_id, role");

  if (!memberships || memberships.length === 0) return [];

  const garageIds = memberships.map((m) => m.garage_id);
  const { data: garages } = await supabase
    .from("garage_settings")
    .select("id, garage_name")
    .in("id", garageIds);

  const roleById = new Map(memberships.map((m) => [m.garage_id, m.role]));

  return (garages ?? []).map((g) => ({
    id: g.id,
    name: g.garage_name,
    role: (roleById.get(g.id) ?? "technician") as GarageRole,
  }));
});

/**
 * The garage the current request should operate on: whatever the
 * `garage_id` cookie names, as long as the user is actually a member of it,
 * otherwise the user's first garage. Throws if the user has no garage at
 * all — callers sit behind the (app) layout's membership gate, which
 * prevents this from happening in normal use.
 */
export const getCurrentGarageId = cache(async (): Promise<string> => {
  const garages = await getUserGarages();
  if (garages.length === 0) {
    throw new Error("No garage membership found for this user.");
  }

  const cookieStore = await cookies();
  const cookieGarageId = cookieStore.get(GARAGE_COOKIE)?.value;
  if (cookieGarageId && garages.some((g) => g.id === cookieGarageId)) {
    return cookieGarageId;
  }

  return garages[0].id;
});

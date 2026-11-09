import { cache } from "react";
import type { GarageRole } from "@/lib/types";
import { getCurrentGarageId, getUserGarages } from "@/lib/supabase/garage";
import { createClient } from "@/lib/supabase/server";

const PERMISSION_KEYS = {
  manageGarageSettings: ["settings.manage"],
  manageEmployees: ["employees.manage"],
  manageLeave: ["employees.manage"],
  manageCustomers: ["customers.manage"],
  manageVehicles: ["customers.manage"],
  manageBookings: ["bookings.manage"],
  manageJobs: ["jobs.manage", "jobs.update"],
  manageVhc: ["jobs.manage", "jobs.update"],
  manageReminders: ["reminders.manage"],
  manageFeedback: ["jobs.manage", "reminders.manage"],
  manageStock: ["inventory.manage"],
  manageInvoices: ["invoices.manage"],
} as const;

export type Permission = keyof typeof PERMISSION_KEYS | "deleteTenantData";

export class PermissionError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "PermissionError";
  }
}

const getGarageAccess = cache(async () => {
  const [garages, garageId, supabase] = await Promise.all([
    getUserGarages(),
    getCurrentGarageId(),
    createClient(),
  ]);
  const garage = garages.find((item) => item.id === garageId);
  if (!garage) throw new PermissionError("You are not a member of this garage.");

  const { data, error } = await supabase.rpc("my_garage_permissions", { p_garage: garageId });
  if (error) throw new PermissionError("Could not verify your garage permissions.");
  return { role: garage.role, keys: new Set(data ?? []) };
});

export async function requirePermission(permission: Permission): Promise<GarageRole> {
  const { role, keys } = await getGarageAccess();
  const allowed = permission === "deleteTenantData"
    ? role === "owner"
    : keys.has("*") || PERMISSION_KEYS[permission].some((key) => keys.has(key));

  if (!allowed) throw new PermissionError();
  return role;
}

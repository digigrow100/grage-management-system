import { cache } from "react";
import type { GarageRole } from "@/lib/types";
import { getCurrentGarageId, getUserGarages } from "@/lib/supabase/garage";

/**
 * Minimum permission rules (spec section 10):
 *  - owner: full garage access.
 *  - manager: operational access plus employees, analytics and settings,
 *    except ownership/destructive tenant actions.
 *  - service_advisor: customers, vehicles, bookings, estimates, jobs,
 *    reminders and stock reads.
 *  - technician: assigned calendar/jobs, vehicle details, mileage, job
 *    notes and line status; no settings, employee pay rates or
 *    business-wide financial analytics.
 */
export const PERMISSIONS = {
  manageGarageSettings: ["owner", "manager"],
  manageEmployees: ["owner", "manager"],
  viewEmployeePayRates: ["owner", "manager"],
  viewBusinessAnalytics: ["owner", "manager"],
  deleteTenantData: ["owner"],
  manageCustomers: ["owner", "manager", "service_advisor"],
  manageVehicles: ["owner", "manager", "service_advisor"],
  manageBookings: ["owner", "manager", "service_advisor"],
  manageJobs: ["owner", "manager", "service_advisor", "technician"],
  manageVhc: ["owner", "manager", "service_advisor", "technician"],
  manageReminders: ["owner", "manager", "service_advisor"],
  manageFeedback: ["owner", "manager", "service_advisor"],
  readStock: ["owner", "manager", "service_advisor", "technician"],
  manageStock: ["owner", "manager", "service_advisor"],
} as const satisfies Record<string, readonly GarageRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export class PermissionError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * The signed-in user's role on the current garage. Memoized per request,
 * same pattern as getCurrentGarageId/getUserGarages.
 */
export const getCurrentGarageRole = cache(async (): Promise<GarageRole> => {
  const [garages, garageId] = await Promise.all([
    getUserGarages(),
    getCurrentGarageId(),
  ]);

  const garage = garages.find((g) => g.id === garageId);
  if (!garage) {
    throw new PermissionError("You are not a member of this garage.");
  }

  return garage.role;
});

/**
 * Server-side guard for mutations. Throws PermissionError if the current
 * user's role on the current garage isn't allowed to perform `permission`.
 * UI-level hiding is a convenience, not a security boundary — every
 * sensitive Server Action should call this before writing.
 */
export async function requirePermission(permission: Permission): Promise<GarageRole> {
  const role = await getCurrentGarageRole();
  const allowed: readonly GarageRole[] = PERMISSIONS[permission];

  if (!allowed.includes(role)) {
    throw new PermissionError(
      `Your role (${role}) doesn't have permission to do this.`
    );
  }

  return role;
}

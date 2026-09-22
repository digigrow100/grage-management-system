"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./server";
import { getCurrentGarageId } from "./garage";
import { requirePermission, PermissionError } from "@/lib/permissions";
import type { Json } from "./database.types";
import type {
  EmployeeRole,
  InvoiceStatus,
  JobPriority,
  JobStatus,
  JobType,
  ProductType,
  PurchaseOrderStatus,
  ServiceDetails,
} from "@/lib/types";
import { JOB_TYPE_LABELS } from "@/lib/job-types";
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS } from "@/lib/job-status";

export interface MutationResult {
  error?: string;
}

export interface CustomerAddressInput {
  addressLine: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postCode: string;
  countryCode?: string;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CustomerContactPrefsInput {
  emailOptIn?: boolean;
  smsOptIn?: boolean;
  marketingOptIn?: boolean;
}

export interface AddCustomerInput extends CustomerAddressInput, CustomerContactPrefsInput {
  customerType?: "individual" | "business";
  fullName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  alternateContactName?: string;
  alternateContactPhone?: string;
  email: string;
  phone: string;
  vehicleRegistration?: string;
}

export async function addCustomer(input: AddCustomerInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      garage_id: garageId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      address_line: input.addressLine,
      address_line_2: input.addressLine2 || null,
      city: input.city,
      county: input.county || null,
      post_code: input.postCode,
      country_code: input.countryCode || "GB",
      google_place_id: input.googlePlaceId || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      customer_type: input.customerType ?? "individual",
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      business_name: input.businessName || null,
      alternate_contact_name: input.alternateContactName || null,
      alternate_contact_phone: input.alternateContactPhone || null,
      email_opt_in: input.emailOptIn ?? true,
      sms_opt_in: input.smsOptIn ?? false,
      marketing_opt_in: input.marketingOptIn ?? false,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const registration = input.vehicleRegistration?.trim();
  if (registration) {
    const { error: vehicleError } = await supabase.from("vehicles").insert({
      garage_id: garageId,
      customer_id: customer.id,
      registration: registration.toUpperCase(),
    });
    if (vehicleError) return { error: vehicleError.message };
  }

  revalidatePath("/customers");
  revalidatePath("/");
  return {};
}

export interface CustomerDependencyCounts {
  vehicles: number;
  bookings: number;
  jobs: number;
  invoices: number;
}

export async function getCustomerDependencyCounts(
  id: string
): Promise<CustomerDependencyCounts> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const [vehicles, bookings, jobs, invoices] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("garage_id", garageId),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("garage_id", garageId),
    supabase
      .from("job_cards")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("garage_id", garageId),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("garage_id", garageId),
  ]);

  const error = vehicles.error ?? bookings.error ?? jobs.error ?? invoices.error;
  if (error) throw new Error(error.message);

  return {
    vehicles: vehicles.count ?? 0,
    bookings: bookings.count ?? 0,
    jobs: jobs.count ?? 0,
    invoices: invoices.count ?? 0,
  };
}

function describeDependencyCounts(counts: CustomerDependencyCounts): string[] {
  return [
    counts.vehicles > 0 && `${counts.vehicles} vehicle${counts.vehicles === 1 ? "" : "s"}`,
    counts.bookings > 0 && `${counts.bookings} booking${counts.bookings === 1 ? "" : "s"}`,
    counts.jobs > 0 && `${counts.jobs} job${counts.jobs === 1 ? "" : "s"}`,
    counts.invoices > 0 && `${counts.invoices} invoice${counts.invoices === 1 ? "" : "s"}`,
  ].filter((p): p is string => Boolean(p));
}

export async function deleteCustomer(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  let counts: CustomerDependencyCounts;
  try {
    counts = await getCustomerDependencyCounts(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to check related records." };
  }

  const parts = describeDependencyCounts(counts);
  if (parts.length > 0) {
    return {
      error: `This customer still has ${parts.join(", ")} on record.`,
    };
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/");
  return {};
}

export async function deleteCustomerCascade(id: string): Promise<MutationResult> {
  try {
    await requirePermission("deleteTenantData");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: invoiceIds, error: invoiceIdsError } = await supabase
    .from("invoices")
    .select("id")
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (invoiceIdsError) return { error: invoiceIdsError.message };

  if (invoiceIds && invoiceIds.length > 0) {
    const { error } = await supabase
      .from("invoice_line_items")
      .delete()
      .in(
        "invoice_id",
        invoiceIds.map((i) => i.id)
      )
      .eq("garage_id", garageId);
    if (error) return { error: error.message };
  }

  const { error: invoicesError } = await supabase
    .from("invoices")
    .delete()
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (invoicesError) return { error: invoicesError.message };

  const { data: jobIds, error: jobIdsError } = await supabase
    .from("job_cards")
    .select("id")
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (jobIdsError) return { error: jobIdsError.message };

  if (jobIds && jobIds.length > 0) {
    const ids = jobIds.map((j) => j.id);
    const { error: labourError } = await supabase
      .from("job_labour_lines")
      .delete()
      .in("job_id", ids)
      .eq("garage_id", garageId);
    if (labourError) return { error: labourError.message };

    const { error: partsError } = await supabase
      .from("job_part_lines")
      .delete()
      .in("job_id", ids)
      .eq("garage_id", garageId);
    if (partsError) return { error: partsError.message };
  }

  const { error: jobsError } = await supabase
    .from("job_cards")
    .delete()
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (jobsError) return { error: jobsError.message };

  const { error: bookingsError } = await supabase
    .from("bookings")
    .delete()
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (bookingsError) return { error: bookingsError.message };

  const { error: vehiclesError } = await supabase
    .from("vehicles")
    .delete()
    .eq("customer_id", id)
    .eq("garage_id", garageId);
  if (vehiclesError) return { error: vehiclesError.message };

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/jobs");
  revalidatePath("/diary");
  revalidatePath("/invoices");
  revalidatePath("/");
  return {};
}

export async function archiveCustomer(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("customers")
    .update({ archived: true })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/");
  return {};
}

export async function restoreCustomer(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("customers")
    .update({ archived: false })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/");
  return {};
}

export interface UpdateCustomerInput extends CustomerAddressInput, CustomerContactPrefsInput {
  customerType?: "individual" | "business";
  fullName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  alternateContactName?: string;
  alternateContactPhone?: string;
  email: string;
  phone: string;
  notes?: string;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("customers")
    .update({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      address_line: input.addressLine,
      address_line_2: input.addressLine2 || null,
      city: input.city,
      county: input.county || null,
      post_code: input.postCode,
      country_code: input.countryCode || "GB",
      google_place_id: input.googlePlaceId || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      customer_type: input.customerType ?? "individual",
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      business_name: input.businessName || null,
      alternate_contact_name: input.alternateContactName || null,
      alternate_contact_phone: input.alternateContactPhone || null,
      email_opt_in: input.emailOptIn ?? true,
      sms_opt_in: input.smsOptIn ?? false,
      marketing_opt_in: input.marketingOptIn ?? false,
      notes: input.notes || null,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return {};
}

export interface VehicleDvlaInput {
  vin?: string | null;
  fuelType?: string | null;
  engineCapacityCc?: number | null;
  co2Emissions?: number | null;
  taxStatus?: string | null;
  taxDueDate?: string | null;
  motStatus?: string | null;
  monthOfFirstRegistration?: string | null;
  dateOfLastV5cIssued?: string | null;
  typeApproval?: string | null;
  wheelplan?: string | null;
  euroStatus?: string | null;
  markedForExport?: boolean | null;
  dvlaLastCheckedAt?: string | null;
}

export interface VehicleInput extends VehicleDvlaInput {
  registration: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  colour?: string | null;
  mileage?: number | null;
  motDue?: string | null;
  lastServiceDate?: string | null;
}

async function recordMileageIfChanged(
  supabase: Awaited<ReturnType<typeof createClient>>,
  garageId: string,
  vehicleId: string,
  previousMileage: number | null,
  nextMileage: number | null | undefined
) {
  if (nextMileage == null || nextMileage === previousMileage) return;
  await supabase.from("vehicle_mileage_history").insert({
    garage_id: garageId,
    vehicle_id: vehicleId,
    mileage: nextMileage,
  });
}

export async function addVehicle(
  customerId: string,
  input: VehicleInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert({
      garage_id: garageId,
      customer_id: customerId,
      registration: input.registration.trim().toUpperCase(),
      make: input.make || null,
      model: input.model || null,
      year: input.year ?? null,
      colour: input.colour || null,
      mileage: input.mileage ?? null,
      mot_due: input.motDue || null,
      last_service_date: input.lastServiceDate || null,
      vin: input.vin || null,
      fuel_type: input.fuelType || null,
      engine_capacity_cc: input.engineCapacityCc ?? null,
      co2_emissions: input.co2Emissions ?? null,
      tax_status: input.taxStatus || null,
      tax_due_date: input.taxDueDate || null,
      mot_status: input.motStatus || null,
      month_of_first_registration: input.monthOfFirstRegistration || null,
      date_of_last_v5c_issued: input.dateOfLastV5cIssued || null,
      type_approval: input.typeApproval || null,
      wheelplan: input.wheelplan || null,
      euro_status: input.euroStatus || null,
      marked_for_export: input.markedForExport ?? null,
      dvla_last_checked_at: input.dvlaLastCheckedAt || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordMileageIfChanged(supabase, garageId, vehicle.id, null, input.mileage);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return {};
}

export async function updateVehicle(
  id: string,
  input: VehicleInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: existing } = await supabase
    .from("vehicles")
    .select("customer_id, mileage")
    .eq("id", id)
    .eq("garage_id", garageId)
    .single();

  if (!existing) return { error: "Vehicle not found." };

  const { error } = await supabase
    .from("vehicles")
    .update({
      registration: input.registration.trim().toUpperCase(),
      make: input.make || null,
      model: input.model || null,
      year: input.year ?? null,
      colour: input.colour || null,
      mileage: input.mileage ?? null,
      mot_due: input.motDue || null,
      last_service_date: input.lastServiceDate || null,
      vin: input.vin || null,
      fuel_type: input.fuelType || null,
      engine_capacity_cc: input.engineCapacityCc ?? null,
      co2_emissions: input.co2Emissions ?? null,
      tax_status: input.taxStatus || null,
      tax_due_date: input.taxDueDate || null,
      mot_status: input.motStatus || null,
      month_of_first_registration: input.monthOfFirstRegistration || null,
      date_of_last_v5c_issued: input.dateOfLastV5cIssued || null,
      type_approval: input.typeApproval || null,
      wheelplan: input.wheelplan || null,
      euro_status: input.euroStatus || null,
      marked_for_export: input.markedForExport ?? null,
      dvla_last_checked_at: input.dvlaLastCheckedAt || null,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  await recordMileageIfChanged(supabase, garageId, id, existing.mileage, input.mileage);

  revalidatePath(`/customers/${existing.customer_id}`);
  revalidatePath("/customers");
  return {};
}

export interface AddBookingInput {
  customerId: string;
  jobType: JobType;
  date: string;
  time?: string;
  durationMinutes?: number;
  estPrice?: number;
  priority?: JobPriority;
  technician?: string;
  employeeId?: string;
  bay?: string;
  notes?: string;
  serviceDetails?: ServiceDetails | null;
  locationType?: "garage" | "customer_address" | "other";
  addressLine?: string;
  postCode?: string;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function addBooking(input: AddBookingInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const technician = input.technician?.trim() || null;
  const bay = input.bay?.trim() || null;
  const employeeId = input.employeeId?.trim() || null;

  const { data: bookingWindow, error: windowError } = await supabase.rpc(
    "compute_booking_window",
    {
      p_garage_id: garageId,
      p_date: input.date,
      p_time: input.time || "09:00:00",
      p_duration_minutes: input.durationMinutes ?? 60,
    }
  );

  if (windowError) return { error: windowError.message };

  const startsAt = bookingWindow.starts_at;
  const endsAt = bookingWindow.ends_at;

  const { data: conflict, error: conflictError } = await supabase.rpc("check_booking_conflict", {
    p_garage_id: garageId,
    p_employee_id: employeeId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });

  if (conflictError) return { error: conflictError.message };
  if (conflict) return { error: conflict };

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      garage_id: garageId,
      customer_id: input.customerId,
      job_type: input.jobType,
      date: input.date,
      time: input.time || null,
      duration_minutes: input.durationMinutes ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      est_price: input.estPrice ?? null,
      technician,
      employee_id: employeeId,
      bay,
      notes: input.notes || null,
      service_details: (input.serviceDetails as unknown as Json) ?? null,
      location_type: input.locationType ?? "garage",
      address_line: input.locationType && input.locationType !== "garage" ? input.addressLine || null : null,
      post_code: input.locationType && input.locationType !== "garage" ? input.postCode || null : null,
      google_place_id: input.googlePlaceId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // A booking always creates its job card so the job moves through the
  // workshop board (booked -> in progress -> ... -> invoiced) from here.
  const { error: jobError } = await supabase.from("job_cards").insert({
    garage_id: garageId,
    booking_id: booking.id,
    customer_id: input.customerId,
    status: "booked",
    priority: input.priority ?? "medium",
    technician,
    description: JOB_TYPE_LABELS[input.jobType],
    due_date: input.date,
    notes: input.notes || null,
  });

  if (jobError) return { error: jobError.message };

  revalidatePath("/diary");
  revalidatePath("/jobs");
  revalidatePath("/");
  return {};
}

export async function deleteBooking(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error: unlinkError } = await supabase
    .from("job_cards")
    .update({ booking_id: null })
    .eq("booking_id", id)
    .eq("garage_id", garageId);

  if (unlinkError) return { error: unlinkError.message };

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/diary");
  revalidatePath("/jobs");
  revalidatePath("/");
  return {};
}

/**
 * Changes a job's status, validating the transition against
 * JOB_STATUS_TRANSITIONS, stamping the relevant lifecycle timestamp, and
 * recording the change in job_status_history. This replaces the old
 * unconditional updateJobStatus — every status change now goes through one
 * validated path (spec 5.11: "Status changes must use one server action
 * that validates transitions, updates timestamps and inserts history").
 */
export async function changeJobStatus(
  id: string,
  status: JobStatus,
  reason?: string
): Promise<MutationResult> {
  try {
    await requirePermission("manageJobs");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: current, error: currentError } = await supabase
    .from("job_cards")
    .select("status")
    .eq("id", id)
    .eq("garage_id", garageId)
    .single();

  if (currentError) return { error: currentError.message };

  const previousStatus = current.status as JobStatus;
  if (previousStatus === status) return {};

  const allowed = JOB_STATUS_TRANSITIONS[previousStatus] ?? [];
  if (!allowed.includes(status)) {
    return {
      error: `Can't move a job from "${JOB_STATUS_LABELS[previousStatus]}" to "${JOB_STATUS_LABELS[status]}".`,
    };
  }

  const now = new Date().toISOString();
  const timestampPatch: Record<string, string> = {};
  if (status === "checked_in") timestampPatch.checked_in_at = now;
  if (status === "in_progress") timestampPatch.started_at = now;
  if (status === "completed") timestampPatch.completed_at = now;
  if (status === "vehicle_released") timestampPatch.released_at = now;

  const { error } = await supabase
    .from("job_cards")
    .update({ status, ...timestampPatch })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: historyError } = await supabase.from("job_status_history").insert({
    garage_id: garageId,
    job_id: id,
    previous_status: previousStatus,
    new_status: status,
    reason: reason || null,
    changed_by: user?.id ?? null,
  });

  if (historyError) return { error: historyError.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/");
  return {};
}

export async function updateJobPriority(
  id: string,
  priority: JobPriority
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("job_cards")
    .update({ priority })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/");
  return {};
}

export async function updateJobTechnician(
  id: string,
  technician: string | null,
  employeeId?: string | null
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("job_cards")
    .update({
      technician: technician?.trim() || null,
      employee_id: employeeId || null,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/");
  return {};
}

export interface JobDetailsInput {
  customerComplaint?: string;
  internalNotes?: string;
}

/**
 * Updates the non-status, non-technician job detail fields (customer
 * complaint, internal notes). Kept separate from changeJobStatus/
 * updateJobTechnician since technicians can edit these without needing
 * status-change permission.
 */
export async function updateJobDetails(
  id: string,
  input: JobDetailsInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageJobs");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("job_cards")
    .update({
      customer_complaint: input.customerComplaint?.trim() || null,
      internal_notes: input.internalNotes?.trim() || null,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${id}`);
  return {};
}

/**
 * Records a mileage-in reading for a job and propagates it to the
 * vehicle's current mileage + vehicle_mileage_history (spec: mileage
 * changes must never silently lose history).
 */
export async function recordVehicleMileage(
  jobId: string,
  mileage: number
): Promise<MutationResult> {
  try {
    await requirePermission("manageJobs");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: job, error: jobError } = await supabase
    .from("job_cards")
    .select("vehicle_id")
    .eq("id", jobId)
    .eq("garage_id", garageId)
    .single();

  if (jobError) return { error: jobError.message };

  const { error } = await supabase
    .from("job_cards")
    .update({ mileage_in: mileage })
    .eq("id", jobId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  if (job.vehicle_id) {
    await supabase
      .from("vehicles")
      .update({ mileage })
      .eq("id", job.vehicle_id)
      .eq("garage_id", garageId);

    // Always logged (not just on change): a mileage-in reading at check-in
    // is a genuine odometer reading tied to this specific job, worth
    // keeping in history even if it happens to match the last value.
    await supabase.from("vehicle_mileage_history").insert({
      garage_id: garageId,
      vehicle_id: job.vehicle_id,
      job_id: jobId,
      mileage,
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export interface JobLinesInput {
  labourLines: { description: string; hours: number; rate: number }[];
  partLines: {
    partId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export async function updateJobLines(
  jobId: string,
  input: JobLinesInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: job, error: jobError } = await supabase
    .from("job_cards")
    .select("id")
    .eq("id", jobId)
    .eq("garage_id", garageId)
    .maybeSingle();

  if (jobError) return { error: jobError.message };
  if (!job) return { error: "Job not found." };

  const { error: deleteLabourError } = await supabase
    .from("job_labour_lines")
    .delete()
    .eq("job_id", jobId)
    .eq("garage_id", garageId);

  if (deleteLabourError) return { error: deleteLabourError.message };

  const { error: deletePartsError } = await supabase
    .from("job_part_lines")
    .delete()
    .eq("job_id", jobId)
    .eq("garage_id", garageId);

  if (deletePartsError) return { error: deletePartsError.message };

  const labourLines = input.labourLines.filter((l) => l.description.trim());
  if (labourLines.length > 0) {
    const { error } = await supabase.from("job_labour_lines").insert(
      labourLines.map((l) => ({
        garage_id: garageId,
        job_id: jobId,
        description: l.description,
        hours: l.hours,
        rate: l.rate,
      }))
    );
    if (error) return { error: error.message };
  }

  const partLines = input.partLines.filter((l) => l.description.trim());
  if (partLines.length > 0) {
    const { error } = await supabase.from("job_part_lines").insert(
      partLines.map((l) => ({
        garage_id: garageId,
        job_id: jobId,
        part_id: l.partId || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  return {};
}

export async function deleteJobCard(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error: labourError } = await supabase
    .from("job_labour_lines")
    .delete()
    .eq("job_id", id)
    .eq("garage_id", garageId);

  if (labourError) return { error: labourError.message };

  const { error: partsError } = await supabase
    .from("job_part_lines")
    .delete()
    .eq("job_id", id)
    .eq("garage_id", garageId);

  if (partsError) return { error: partsError.message };

  const { error: unlinkError } = await supabase
    .from("invoices")
    .update({ job_id: null })
    .eq("job_id", id)
    .eq("garage_id", garageId);

  if (unlinkError) return { error: unlinkError.message };

  const { error } = await supabase
    .from("job_cards")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath("/");
  return {};
}

export interface InvoiceInput {
  customerId: string;
  vehicleId: string;
  invoiceDate: string;
  dueDate: string;
  vatRate: number;
  status?: InvoiceStatus;
  notes?: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

export async function addInvoice(input: InvoiceInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      garage_id: garageId,
      customer_id: input.customerId,
      vehicle_id: input.vehicleId || null,
      date: input.invoiceDate,
      due_date: input.dueDate,
      vat_rate: input.vatRate,
      status: input.status,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const lineItems = input.lineItems.filter((li) => li.description.trim());
  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .insert(
        lineItems.map((li) => ({
          garage_id: garageId,
          invoice_id: invoice.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unitPrice,
        }))
      );
    if (lineItemsError) return { error: lineItemsError.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return {};
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("invoices")
    .update({
      customer_id: input.customerId,
      vehicle_id: input.vehicleId || null,
      date: input.invoiceDate,
      due_date: input.dueDate,
      vat_rate: input.vatRate,
      status: input.status,
      notes: input.notes || null,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  const { error: deleteError } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", id)
    .eq("garage_id", garageId);

  if (deleteError) return { error: deleteError.message };

  const lineItems = input.lineItems.filter((li) => li.description.trim());
  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .insert(
        lineItems.map((li) => ({
          garage_id: garageId,
          invoice_id: id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unitPrice,
        }))
      );
    if (lineItemsError) return { error: lineItemsError.message };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  return {};
}

export async function convertEstimateToInvoice(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", id)
    .eq("garage_id", garageId)
    .eq("status", "estimate");

  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  return {};
}

export async function deleteInvoice(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error: lineItemsError } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", id)
    .eq("garage_id", garageId);

  if (lineItemsError) return { error: lineItemsError.message };

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath("/");
  return {};
}

export interface PartInput {
  sku: string;
  name: string;
  supplier?: string;
  supplierId?: string | null;
  category?: string;
  productType?: ProductType;
  stockLevel: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  defaultWarehouseId?: string | null;
  tyreWidth?: number | null;
  tyreProfile?: number | null;
  tyreRimSize?: number | null;
  tyreLoadIndex?: string | null;
  tyreSpeedRating?: string | null;
}

function partWriteFields(input: PartInput) {
  return {
    sku: input.sku,
    name: input.name,
    supplier: input.supplier || null,
    supplier_id: input.supplierId || null,
    category: input.category || null,
    product_type: input.productType ?? "part",
    reorder_level: input.reorderLevel,
    cost_price: input.costPrice,
    sell_price: input.sellPrice,
    default_warehouse_id: input.defaultWarehouseId || null,
    tyre_width: input.tyreWidth ?? null,
    tyre_profile: input.tyreProfile ?? null,
    tyre_rim_size: input.tyreRimSize ?? null,
    tyre_load_index: input.tyreLoadIndex || null,
    tyre_speed_rating: input.tyreSpeedRating || null,
  };
}

export async function addPart(input: PartInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("parts").insert({
    garage_id: garageId,
    stock_level: input.stockLevel,
    ...partWriteFields(input),
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/");
  return {};
}

export async function updatePart(
  id: string,
  input: PartInput
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("parts")
    .update(partWriteFields(input))
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/");
  return {};
}

export async function deletePart(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("parts")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/");
  return {};
}

// ---- Stock adjustments ----

export interface StockAdjustmentInput {
  partId: string;
  warehouseId?: string | null;
  quantity: number;
  notes?: string;
}

export async function adjustStock(
  input: StockAdjustmentInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  if (input.quantity === 0) return { error: "Quantity must not be zero." };

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("stock_movements").insert({
    garage_id: garageId,
    part_id: input.partId,
    warehouse_id: input.warehouseId || null,
    movement_type: "adjustment",
    quantity: input.quantity,
    notes: input.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ---- Suppliers ----

export interface SupplierInput {
  name: string;
  accountNumber?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  notes?: string;
}

function supplierWriteFields(input: SupplierInput) {
  return {
    name: input.name,
    account_number: input.accountNumber || null,
    contact_name: input.contactName || null,
    email: input.email || null,
    phone: input.phone || null,
    address_line_1: input.addressLine1 || null,
    address_line_2: input.addressLine2 || null,
    city: input.city || null,
    postcode: input.postcode || null,
    notes: input.notes || null,
  };
}

export async function addSupplier(input: SupplierInput): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("suppliers").insert({
    garage_id: garageId,
    ...supplierWriteFields(input),
  });

  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return {};
}

export async function updateSupplier(
  id: string,
  input: SupplierInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("suppliers")
    .update(supplierWriteFields(input))
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return {};
}

export async function deleteSupplier(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/suppliers");
  return {};
}

// ---- Warehouses ----

export interface WarehouseInput {
  name: string;
  isDefault?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  notes?: string;
}

function warehouseWriteFields(input: WarehouseInput) {
  return {
    name: input.name,
    is_default: input.isDefault ?? false,
    address_line_1: input.addressLine1 || null,
    address_line_2: input.addressLine2 || null,
    city: input.city || null,
    postcode: input.postcode || null,
    notes: input.notes || null,
  };
}

export async function addWarehouse(input: WarehouseInput): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("warehouses").insert({
    garage_id: garageId,
    ...warehouseWriteFields(input),
  });

  if (error) return { error: error.message };
  revalidatePath("/warehouses");
  return {};
}

export async function updateWarehouse(
  id: string,
  input: WarehouseInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("warehouses")
    .update(warehouseWriteFields(input))
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/warehouses");
  return {};
}

export async function deleteWarehouse(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("warehouses")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/warehouses");
  return {};
}

// ---- Purchase orders ----

export interface PurchaseOrderLineInput {
  partId?: string | null;
  description: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface PurchaseOrderInput {
  supplierId?: string | null;
  warehouseId?: string | null;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput
): Promise<MutationResult & { id?: string }> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  if (input.lines.length === 0) {
    return { error: "Add at least one line before creating a purchase order." };
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      garage_id: garageId,
      supplier_id: input.supplierId || null,
      warehouse_id: input.warehouseId || null,
      order_date: input.orderDate || null,
      expected_date: input.expectedDate || null,
      notes: input.notes || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: linesError } = await supabase.from("purchase_order_lines").insert(
    input.lines.map((line) => ({
      garage_id: garageId,
      purchase_order_id: po.id,
      part_id: line.partId || null,
      description: line.description,
      quantity_ordered: line.quantityOrdered,
      unit_cost: line.unitCost,
    }))
  );

  if (linesError) return { error: linesError.message };

  revalidatePath("/purchase-orders");
  return { id: po.id };
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus
): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
  return {};
}

export async function receivePurchaseOrderLine(
  lineId: string,
  quantity: number,
  unitCost?: number
): Promise<MutationResult> {
  try {
    await requirePermission("manageStock");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase_order_line", {
    p_line_id: lineId,
    p_quantity: quantity,
    p_unit_cost: unitCost,
  });

  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  revalidatePath("/inventory");
  return {};
}

// ---- VHC (Vehicle Health Check) ----

export interface StartVhcCheckInput {
  jobId: string;
  templateId?: string | null;
  technicianId?: string | null;
}

export async function startVhcCheck(
  input: StartVhcCheckInput
): Promise<MutationResult & { id?: string }> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: check, error } = await supabase
    .from("vhc_checks")
    .insert({
      garage_id: garageId,
      job_id: input.jobId,
      template_id: input.templateId || null,
      technician_id: input.technicianId || null,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (input.templateId) {
    const { data: templateItems, error: templateItemsError } = await supabase
      .from("vhc_template_items")
      .select("*")
      .eq("template_id", input.templateId)
      .order("sort_order", { ascending: true });

    if (templateItemsError) return { error: templateItemsError.message };

    if (templateItems && templateItems.length > 0) {
      const { error: itemsError } = await supabase.from("vhc_items").insert(
        templateItems.map((item) => ({
          garage_id: garageId,
          vhc_check_id: check.id,
          category: item.category,
          label: item.label,
          sort_order: item.sort_order,
        }))
      );
      if (itemsError) return { error: itemsError.message };
    }
  }

  revalidatePath(`/jobs/${input.jobId}`);
  return { id: check.id };
}

export interface VhcItemDraftInput {
  category?: string;
  label: string;
}

export async function addVhcItem(
  vhcCheckId: string,
  jobId: string,
  input: VhcItemDraftInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("vhc_items").insert({
    garage_id: garageId,
    vhc_check_id: vhcCheckId,
    category: input.category || "General",
    label: input.label,
  });

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export interface UpdateVhcItemInput {
  result?: string;
  notes?: string;
}

export async function updateVhcItem(
  itemId: string,
  jobId: string,
  input: UpdateVhcItemInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("vhc_items")
    .update({
      ...(input.result !== undefined ? { result: input.result } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    })
    .eq("id", itemId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export async function addVhcItemPhoto(
  itemId: string,
  jobId: string,
  path: string
): Promise<MutationResult> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data: item, error: fetchError } = await supabase
    .from("vhc_items")
    .select("photo_paths")
    .eq("id", itemId)
    .eq("garage_id", garageId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("vhc_items")
    .update({ photo_paths: [...(item.photo_paths ?? []), path] })
    .eq("id", itemId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export async function completeVhcCheck(
  vhcCheckId: string,
  jobId: string
): Promise<MutationResult> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("vhc_checks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", vhcCheckId)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export interface VhcTemplateItemDraftInput {
  category: string;
  label: string;
  sortOrder: number;
}

export interface VhcTemplateInput {
  name: string;
  isDefault?: boolean;
  items: VhcTemplateItemDraftInput[];
}

export async function saveVhcTemplate(
  input: VhcTemplateInput,
  templateId?: string
): Promise<MutationResult & { id?: string }> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  let id = templateId;
  if (id) {
    const { error } = await supabase
      .from("vhc_templates")
      .update({ name: input.name, is_default: input.isDefault ?? false })
      .eq("id", id)
      .eq("garage_id", garageId);
    if (error) return { error: error.message };

    const { error: deleteError } = await supabase
      .from("vhc_template_items")
      .delete()
      .eq("template_id", id);
    if (deleteError) return { error: deleteError.message };
  } else {
    const { data: template, error } = await supabase
      .from("vhc_templates")
      .insert({ garage_id: garageId, name: input.name, is_default: input.isDefault ?? false })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = template.id;
  }

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from("vhc_template_items").insert(
      input.items.map((item) => ({
        garage_id: garageId,
        template_id: id,
        category: item.category,
        label: item.label,
        sort_order: item.sortOrder,
      }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath("/settings");
  return { id };
}

export async function deleteVhcTemplate(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageVhc");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("vhc_templates")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

// ---- Feedback ----

export async function sendFeedbackRequest(
  jobId: string,
  customerId: string
): Promise<MutationResult & { token?: string }> {
  try {
    await requirePermission("manageFeedback");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data, error } = await supabase
    .rpc("create_feedback_request", {
      p_job_id: jobId,
      p_customer_id: customerId,
      p_garage_id: garageId,
    })
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/feedback");
  return { token: data.token };
}

export interface OpenFeedbackRequestResult {
  requestStatus: string;
  expired: boolean;
  garageName: string | null;
  customerName: string | null;
  vehicleLabel: string | null;
  alreadyResponded: boolean;
}

export async function openFeedbackRequestByToken(
  token: string
): Promise<OpenFeedbackRequestResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_feedback_request", { p_token: token }).single();
  if (error) return null;
  return {
    requestStatus: data.request_status,
    expired: data.expired,
    garageName: data.garage_name,
    customerName: data.customer_name,
    vehicleLabel: data.vehicle_label,
    alreadyResponded: data.already_responded,
  };
}

export async function submitFeedbackResponseByToken(
  token: string,
  npsScore: number,
  comment?: string
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback_response", {
    p_token: token,
    p_nps_score: npsScore,
    p_comment: comment,
  });
  if (error) return { error: error.message };
  return {};
}

export interface EmployeeInput {
  fullName: string;
  role: EmployeeRole;
  email?: string;
  phone?: string;
  hourlyRate: number;
  active: boolean;
}

export async function addEmployee(input: EmployeeInput): Promise<MutationResult> {
  try {
    await requirePermission("manageEmployees");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("employees").insert({
    garage_id: garageId,
    full_name: input.fullName,
    role: input.role,
    email: input.email || null,
    phone: input.phone || null,
    hourly_rate: input.hourlyRate,
    active: input.active,
  });

  if (error) return { error: error.message };

  revalidatePath("/employees");
  return {};
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageEmployees");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName,
      role: input.role,
      email: input.email || null,
      phone: input.phone || null,
      hourly_rate: input.hourlyRate,
      active: input.active,
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/employees");
  return {};
}

export async function deleteEmployee(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageEmployees");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/employees");
  return {};
}

export interface ReminderInput {
  customerId?: string;
  vehicleId?: string;
  title: string;
  dueDate: string;
  notes?: string;
  reminderType?: "mot" | "service" | "booking" | "general";
  channel?: "in_app" | "email" | "sms";
}

export async function addReminder(input: ReminderInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("reminders").insert({
    garage_id: garageId,
    customer_id: input.customerId || null,
    vehicle_id: input.vehicleId || null,
    title: input.title,
    due_date: input.dueDate,
    notes: input.notes || null,
    reminder_type: input.reminderType ?? "general",
    channel: input.channel ?? "in_app",
    status: "scheduled",
    scheduled_at: new Date(input.dueDate).toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return {};
}

export async function toggleReminderDone(
  id: string,
  done: boolean
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("reminders")
    .update({ done, status: done ? "completed" : "scheduled" })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return {};
}

export async function cancelReminder(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("reminders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  return {};
}

export async function retryReminder(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("reminders")
    .update({ status: "scheduled", error_message: null })
    .eq("id", id)
    .eq("garage_id", garageId)
    .eq("status", "failed");

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  return {};
}

export async function deleteReminder(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return {};
}

export interface ReminderSettingsInput {
  reminderType: "mot" | "service" | "booking" | "general";
  enabled: boolean;
  daysBefore?: number;
  hoursBefore?: number;
  emailEnabled: boolean;
}

export async function updateReminderSettings(
  input: ReminderSettingsInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("reminder_settings").upsert(
    {
      garage_id: garageId,
      reminder_type: input.reminderType,
      enabled: input.enabled,
      days_before: input.daysBefore ?? null,
      hours_before: input.hoursBefore ?? null,
      email_enabled: input.emailEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "garage_id,reminder_type" }
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/reminders");
  return {};
}

/**
 * Idempotent: only transitions in_app reminders from 'scheduled' to 'sent'
 * once their scheduled_at has passed — the WHERE status='scheduled' guard
 * means running this twice never double-processes a reminder. email/sms
 * reminders are left untouched: no provider is configured, so there is no
 * real send to perform yet, and this deliberately does not fabricate one.
 */
export async function processDueReminders(): Promise<MutationResult & { processed?: number }> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data, error } = await supabase
    .from("reminders")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("garage_id", garageId)
    .eq("channel", "in_app")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  return { processed: data?.length ?? 0 };
}

export interface GarageSettingsInput {
  garageName: string;
  addressLine: string;
  city: string;
  postCode: string;
  vatNumber: string;
  defaultVatRate: number;
  invoicePrefix: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  currency?: string;
  vatMode?: "not_registered" | "inclusive" | "exclusive";
  defaultLabourRate?: number;
}

export async function updateGarageSettings(
  id: string,
  input: GarageSettingsInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  if (id !== garageId) {
    return { error: "You can only edit the currently selected garage." };
  }

  const payload = {
    garage_name: input.garageName,
    address_line: input.addressLine,
    city: input.city,
    post_code: input.postCode,
    vat_number: input.vatNumber,
    default_vat_rate: input.defaultVatRate,
    invoice_prefix: input.invoicePrefix,
    contact_email: input.contactEmail || null,
    contact_phone: input.contactPhone || null,
    timezone: input.timezone || "Europe/London",
    currency: input.currency || "GBP",
    vat_mode: input.vatMode || "not_registered",
    default_labour_rate: input.defaultLabourRate ?? 0,
  };

  const { error } = await supabase
    .from("garage_settings")
    .update(payload)
    .eq("id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  return {};
}

// ---- Estimates ----

export interface EstimateLineInput {
  lineType: "labour" | "part" | "other";
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface EstimateInput {
  customerId: string;
  vehicleId?: string;
  issueDate: string;
  validUntil?: string;
  vatRate: number;
  notes?: string;
  lines: EstimateLineInput[];
}

function estimateTotals(lines: EstimateLineInput[], vatRate: number) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const vatTotal = subtotal * (vatRate / 100);
  return { subtotal, vatTotal, total: subtotal + vatTotal };
}

export async function createEstimate(input: EstimateInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const lines = input.lines.filter((l) => l.description.trim());
  const { subtotal, vatTotal, total } = estimateTotals(lines, input.vatRate);

  const { data: estimate, error } = await supabase
    .from("estimates")
    .insert({
      garage_id: garageId,
      customer_id: input.customerId,
      vehicle_id: input.vehicleId || null,
      issue_date: input.issueDate,
      valid_until: input.validUntil || null,
      notes: input.notes || null,
      subtotal,
      vat_total: vatTotal,
      total,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (lines.length > 0) {
    const { error: linesError } = await supabase.from("estimate_lines").insert(
      lines.map((l, index) => ({
        garage_id: garageId,
        estimate_id: estimate.id,
        line_type: l.lineType,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        line_total: l.quantity * l.unitPrice,
        sort_order: index,
      }))
    );
    if (linesError) return { error: linesError.message };
  }

  revalidatePath("/estimates");
  return {};
}

export async function updateEstimateStatus(
  id: string,
  status: "draft" | "sent" | "accepted" | "declined" | "expired"
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("estimates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("garage_id", garageId)
    .neq("status", "booked");

  if (error) return { error: error.message };

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${id}`);
  return {};
}

export async function deleteEstimate(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId)
    .neq("status", "booked");

  if (error) return { error: error.message };

  revalidatePath("/estimates");
  return {};
}

export interface ConvertEstimateInput {
  date: string;
  time?: string;
  durationMinutes?: number;
  employeeId?: string;
  jobType?: JobType;
}

/**
 * Converts an estimate into a booking + job card, preserving every line as
 * a snapshot. Runs as a single database transaction (convert_estimate_to_booking,
 * migration 0023) so it can never partially apply and an estimate can never
 * be converted twice, even under concurrent requests — the DB function
 * locks the estimate row for the duration of the call.
 */
export async function convertEstimateToBooking(
  estimateId: string,
  input: ConvertEstimateInput
): Promise<MutationResult & { jobId?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("convert_estimate_to_booking", {
    p_estimate_id: estimateId,
    p_date: input.date,
    p_time: input.time || "09:00:00",
    p_duration_minutes: input.durationMinutes ?? 60,
    p_employee_id: input.employeeId || null,
    p_job_type: input.jobType ?? "other",
  });

  if (error) return { error: error.message };

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath("/diary");
  revalidatePath("/jobs");
  return { jobId: data ?? undefined };
}

// ---- Garage opening hours, closures, calendar behaviour, service catalogue ----

export interface OpeningHoursDayInput {
  weekday: number;
  isClosed: boolean;
  is24Hours: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export async function updateOpeningHours(
  days: OpeningHoursDayInput[]
): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("garage_opening_hours").upsert(
    days.map((d) => ({
      garage_id: garageId,
      weekday: d.weekday,
      is_closed: d.isClosed,
      is_24_hours: d.is24Hours,
      opens_at: d.is24Hours || d.isClosed ? null : d.opensAt,
      closes_at: d.is24Hours || d.isClosed ? null : d.closesAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "garage_id,weekday" }
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export interface CalendarSettingsInput {
  calendarStartHour: number;
  calendarEndHour: number;
  calendarSlotMinutes: number;
  allowOverlappingJobs: boolean;
  smartGapMinutes: number;
}

export async function updateCalendarSettings(
  input: CalendarSettingsInput
): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("garage_settings")
    .update({
      calendar_start_hour: input.calendarStartHour,
      calendar_end_hour: input.calendarEndHour,
      calendar_slot_minutes: input.calendarSlotMinutes,
      allow_overlapping_jobs: input.allowOverlappingJobs,
      smart_gap_minutes: input.smartGapMinutes,
    })
    .eq("id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/diary");
  return {};
}

export interface ClosureInput {
  startsAt: string;
  endsAt: string;
  title?: string;
  closureType?: string;
}

export async function addClosure(input: ClosureInput): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("garage_closures").insert({
    garage_id: garageId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    title: input.title || null,
    closure_type: input.closureType || "custom",
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteClosure(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("garage_closures")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export interface ServiceInput {
  name: string;
  description?: string;
  category?: string;
  defaultDurationMinutes: number;
  defaultLabourPrice?: number;
  vatRate?: number;
  active: boolean;
}

export async function upsertService(
  input: ServiceInput,
  id?: string
): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const payload = {
    garage_id: garageId,
    name: input.name,
    description: input.description || null,
    category: input.category || null,
    default_duration_minutes: input.defaultDurationMinutes,
    default_labour_price: input.defaultLabourPrice ?? null,
    vat_rate: input.vatRate ?? null,
    active: input.active,
  };

  const { error } = id
    ? await supabase.from("service_catalogue").update(payload).eq("id", id).eq("garage_id", garageId)
    : await supabase.from("service_catalogue").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteService(id: string): Promise<MutationResult> {
  try {
    await requirePermission("manageGarageSettings");
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }

  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("service_catalogue")
    .delete()
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

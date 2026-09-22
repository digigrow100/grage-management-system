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
  ServiceDetails,
} from "@/lib/types";
import { JOB_TYPE_LABELS } from "@/lib/job-types";

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

export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("job_cards")
    .update({ status })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

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
  technician: string | null
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase
    .from("job_cards")
    .update({ technician: technician?.trim() || null })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/");
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
  category?: string;
  stockLevel: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
}

export async function addPart(input: PartInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("parts").insert({
    garage_id: garageId,
    sku: input.sku,
    name: input.name,
    supplier: input.supplier || null,
    category: input.category || null,
    stock_level: input.stockLevel,
    reorder_level: input.reorderLevel,
    cost_price: input.costPrice,
    sell_price: input.sellPrice,
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
    .update({
      sku: input.sku,
      name: input.name,
      supplier: input.supplier || null,
      category: input.category || null,
      stock_level: input.stockLevel,
      reorder_level: input.reorderLevel,
      cost_price: input.costPrice,
      sell_price: input.sellPrice,
    })
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
}

export async function addReminder(input: ReminderInput): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("reminders").insert({
    garage_id: garageId,
    customer_id: input.customerId || null,
    vehicle_id: input.vehicleId || null,
    title: input.title,
    due_date: input.dueDate,
    notes: input.notes || null,
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
    .update({ done })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
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

export interface GarageSettingsInput {
  garageName: string;
  addressLine: string;
  city: string;
  postCode: string;
  vatNumber: string;
  defaultVatRate: number;
  invoicePrefix: string;
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

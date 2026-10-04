"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./server";
import { getCurrentGarageId } from "./garage";
import type { Json } from "./database.types";
import type {
  EmployeeRole,
  InvoiceStatus,
  JobPriority,
  JobStatus,
  JobType,
  ServiceDetails,
} from "@/lib/types";

export interface MutationResult {
  error?: string;
}

export async function addCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postCode: string;
  vehicleRegistration?: string;
}): Promise<MutationResult> {
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
      city: input.city,
      post_code: input.postCode,
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

export async function addVehicle(input: {
  customerId: string;
  registration: string;
  make?: string;
  model?: string;
  colour?: string;
  year?: number;
  mileage?: number;
  motDue?: string;
  lastServiceDate?: string;
}): Promise<MutationResult> {
  const registration = input.registration.trim().toUpperCase();
  if (!registration || registration.length > 20)
    return { error: "Enter a valid vehicle registration." };
  if (
    input.year !== undefined &&
    (!Number.isInteger(input.year) ||
      input.year < 1886 ||
      input.year > new Date().getFullYear() + 1)
  ) {
    return { error: "Enter a valid vehicle year." };
  }
  if (
    input.mileage !== undefined &&
    (!Number.isInteger(input.mileage) ||
      input.mileage < 0 ||
      input.mileage > 2147483647)
  ) {
    return { error: "Enter a valid mileage." };
  }
  for (const date of [input.motDue, input.lastServiceDate]) {
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    ) {
      return { error: "Enter a valid date." };
    }
  }
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, archived")
    .eq("id", input.customerId)
    .eq("garage_id", garageId)
    .single();
  if (customerError || !customer || customer.archived)
    return { error: "This customer is unavailable. Refresh and try again." };
  const { error } = await supabase.from("vehicles").insert({
    garage_id: garageId,
    customer_id: customer.id,
    registration,
    make: input.make?.trim() || null,
    model: input.model?.trim() || null,
    colour: input.colour?.trim() || null,
    year: input.year ?? null,
    mileage: input.mileage ?? null,
    mot_due: input.motDue || null,
    last_service_date: input.lastServiceDate || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customer.id}`);
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
  id: string,
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

  const error =
    vehicles.error ?? bookings.error ?? jobs.error ?? invoices.error;
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
    counts.vehicles > 0 &&
      `${counts.vehicles} vehicle${counts.vehicles === 1 ? "" : "s"}`,
    counts.bookings > 0 &&
      `${counts.bookings} booking${counts.bookings === 1 ? "" : "s"}`,
    counts.jobs > 0 && `${counts.jobs} job${counts.jobs === 1 ? "" : "s"}`,
    counts.invoices > 0 &&
      `${counts.invoices} invoice${counts.invoices === 1 ? "" : "s"}`,
  ].filter((p): p is string => Boolean(p));
}

export async function deleteCustomer(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  let counts: CustomerDependencyCounts;
  try {
    counts = await getCustomerDependencyCounts(id);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Failed to check related records.",
    };
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

export async function deleteCustomerCascade(
  id: string,
): Promise<MutationResult> {
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
        invoiceIds.map((i) => i.id),
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

export async function updateCustomer(
  id: string,
  input: {
    fullName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    postCode: string;
    notes?: string;
    emailOptIn?: boolean;
  },
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
      city: input.city,
      post_code: input.postCode,
      notes: input.notes || null,
      ...(input.emailOptIn === undefined
        ? {}
        : { email_opt_in: input.emailOptIn }),
    })
    .eq("id", id)
    .eq("garage_id", garageId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return {};
}

export async function addBooking(input: {
  customerId: string;
  vehicleId: string;
  jobType: JobType;
  date: string;
  time: string;
  durationMinutes: number;
  estPrice?: number;
  priority?: JobPriority;
  technician?: string;
  bay?: string;
  notes?: string;
  serviceDetails?: ServiceDetails | null;
}): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { error } = await supabase.rpc("create_workshop_booking", {
    p_garage: garageId,
    p_customer: input.customerId,
    p_vehicle: input.vehicleId,
    p_type: input.jobType,
    p_date: input.date,
    p_time: input.time,
    p_duration: input.durationMinutes,
    p_price: input.estPrice ?? 0,
    p_priority: input.priority ?? "medium",
    p_technician: input.technician ?? "",
    p_bay: input.bay ?? "",
    p_notes: input.notes ?? "",
    p_details: (input.serviceDetails ?? {}) as unknown as Json,
  });
  if (error) return { error: error.message };
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
  status: JobStatus,
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
  priority: JobPriority,
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
    costPrice?: number;
  }[];
}

export async function updateJobLines(
  jobId: string,
  input: JobLinesInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_workshop_job_lines", {
    p_job: jobId,
    p_labour: input.labourLines.filter((l) =>
      l.description.trim(),
    ) as unknown as Json,
    p_parts: input.partLines.filter((l) =>
      l.description.trim(),
    ) as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/inventory");
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

async function saveInvoice(
  id: string | null,
  input: InvoiceInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { error } = await supabase.rpc("save_workshop_invoice", {
    p_garage: garageId,
    p_id: id!,
    p_input: {
      ...input,
      status: input.status ?? "draft",
      lineItems: input.lineItems.filter((l) => l.description.trim()),
    },
  });
  if (error) return { error: error.message };
  revalidatePath("/invoices");
  if (id) revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  revalidatePath("/accounting");
  return {};
}
export async function addInvoice(input: InvoiceInput): Promise<MutationResult> {
  return saveInvoice(null, input);
}
export async function updateInvoice(
  id: string,
  input: InvoiceInput,
): Promise<MutationResult> {
  return saveInvoice(id, input);
}

export async function convertEstimateToInvoice(
  id: string,
): Promise<MutationResult> {
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
  input: PartInput,
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

export async function addEmployee(
  input: EmployeeInput,
): Promise<MutationResult> {
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
  input: EmployeeInput,
): Promise<MutationResult> {
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
  sendEmail?: boolean;
  customerId?: string;
  vehicleId?: string;
  title: string;
  dueDate: string;
  notes?: string;
}

export async function addReminder(
  input: ReminderInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { error } = await supabase.from("reminders").insert({
    garage_id: garageId,
    customer_id: input.customerId || null,
    vehicle_id: input.vehicleId || null,
    title: input.title,
    delivery_channel: input.sendEmail ? "email" : "none",
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
  done: boolean,
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
  input: GarageSettingsInput,
): Promise<MutationResult> {
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

export async function updateVehicle(
  id: string,
  input: Parameters<typeof addVehicle>[0],
): Promise<MutationResult> {
  const registration = input.registration.trim().toUpperCase();
  if (!registration || registration.length > 20)
    return { error: "Enter a valid registration." };
  if (
    input.year !== undefined &&
    (!Number.isInteger(input.year) ||
      input.year < 1886 ||
      input.year > new Date().getFullYear() + 1)
  )
    return { error: "Enter a valid year." };
  if (
    input.mileage !== undefined &&
    (!Number.isInteger(input.mileage) ||
      input.mileage < 0 ||
      input.mileage > 2147483647)
  )
    return { error: "Enter a valid mileage." };
  for (const date of [input.motDue, input.lastServiceDate])
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      return { error: "Enter a valid date." };
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vehicles")
    .update({
      registration,
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      colour: input.colour?.trim() || null,
      year: input.year ?? null,
      mileage: input.mileage ?? null,
      mot_due: input.motDue || null,
      last_service_date: input.lastServiceDate || null,
    })
    .eq("id", id)
    .eq("customer_id", input.customerId)
    .eq("garage_id", garageId)
    .select("id")
    .single();
  if (error || !data)
    return { error: error?.message ?? "Vehicle unavailable." };
  revalidatePath(`/customers/${input.customerId}`);
  revalidatePath("/customers");
  revalidatePath("/reminders");
  return {};
}

export async function createJobInvoice(
  jobId: string,
): Promise<MutationResult & { id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice_from_job", {
    p_job: jobId,
  });
  if (error) return { error: error.message };
  revalidatePath("/invoices");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return { id: data };
}
export async function assignJobVehicle(
  jobId: string,
  vehicleId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data: job } = await supabase
    .from("job_cards")
    .select("customer_id")
    .eq("id", jobId)
    .eq("garage_id", garageId)
    .single();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("customer_id", job?.customer_id ?? "")
    .eq("garage_id", garageId)
    .single();
  if (!job || !vehicle) return { error: "Choose this customer's vehicle." };
  const { error } = await supabase
    .from("job_cards")
    .update({ vehicle_id: vehicle.id })
    .eq("id", jobId)
    .eq("garage_id", garageId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return {};
}
export async function recordPayment(
  invoiceId: string,
  form: FormData,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_invoice_payment", {
    p_invoice: invoiceId,
    p_amount: Number(form.get("amount")),
    p_date: String(form.get("paidOn")),
    p_method: String(form.get("method")),
    p_reference: String(form.get("reference") ?? ""),
  });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/accounting");
  revalidatePath("/reports");
  revalidatePath("/");
  return {};
}
export async function addExpense(form: FormData): Promise<MutationResult> {
  const amount = Number(form.get("amount")),
    description = String(form.get("description") ?? "").trim(),
    date = String(form.get("date") ?? "");
  if (
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  )
    return { error: "Enter a description, positive amount and date." };
  const supabase = await createClient();
  const { error } = await supabase.from("garage_expenses").insert({
    garage_id: await getCurrentGarageId(),
    description,
    amount,
    category: String(form.get("category") ?? "other"),
    spent_on: date,
  });
  if (error) return { error: error.message };
  revalidatePath("/accounting");
  return {};
}
export async function saveReminderSettings(
  form: FormData,
): Promise<MutationResult> {
  const supabase = await createClient();
  const days = Number(form.get("days")),
    months = Number(form.get("months"));
  if (
    !Number.isInteger(days) ||
    days < 0 ||
    days > 90 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 60
  )
    return { error: "Choose valid reminder days and service interval." };
  const { error } = await supabase
    .from("garage_settings")
    .update({
      automatic_reminders: form.get("enabled") === "on",
      reminder_days_before: days,
      service_interval_months: months,
    })
    .eq("id", await getCurrentGarageId());
  if (error) return { error: error.message };
  revalidatePath("/reminders");
  return {};
}
export async function sendDueReminders(): Promise<
  MutationResult & { message?: string }
> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { error } = await supabase.rpc("queue_garage_reminders", {
    p_garage: garageId,
  });
  if (error) return { error: error.message };
  const { data, error: sendError } = await supabase.functions.invoke(
    "deliver-garage-reminders",
    { body: { garageId } },
  );
  revalidatePath("/reminders");
  if (sendError)
    return {
      error:
        "Email delivery is not ready. Set RESEND_API_KEY and REMINDER_FROM_EMAIL in Supabase function secrets.",
    };
  if (data?.error) return { error: data.error };
  return {
    message: `${data.sent ?? 0} reminders sent; ${data.failed ?? 0} failed.`,
  };
}

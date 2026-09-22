import { createClient } from "./server";
import { getCurrentGarageId } from "./garage";
import type { Tables } from "./database.types";
import type {
  Booking,
  Customer,
  Employee,
  EmployeeRole,
  Estimate,
  EstimateLine,
  GarageClosure,
  GarageOpeningHours,
  GarageSettings,
  ServiceCatalogueItem,
  Invoice,
  InvoiceLineItem,
  JobCard,
  JobLabourLine,
  JobPartLine,
  JobStatusHistoryEntry,
  Part,
  Reminder,
  ServiceDetails,
  Vehicle,
} from "@/lib/types";

type CustomerRow = Tables<"customers">;
type VehicleRow = Tables<"vehicles">;
type PartRow = Tables<"parts">;
type BookingRow = Tables<"bookings">;
type EmployeeRow = Tables<"employees">;
type ReminderRow = Tables<"reminders">;
type GarageSettingsRow = Tables<"garage_settings">;
type JobCardRow = Tables<"job_cards"> & {
  job_labour_lines: Tables<"job_labour_lines">[];
  job_part_lines: Tables<"job_part_lines">[];
};
type InvoiceRow = Tables<"invoices"> & {
  invoice_line_items: Tables<"invoice_line_items">[];
};
type EstimateRow = Tables<"estimates"> & {
  estimate_lines: Tables<"estimate_lines">[];
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address_line,
    city: row.city,
    postCode: row.post_code,
    createdAt: row.created_at,
    notes: row.notes,
    archived: row.archived,
    customerType: row.customer_type === "business" ? "business" : "individual",
    firstName: row.first_name,
    lastName: row.last_name,
    businessName: row.business_name,
    alternateContactName: row.alternate_contact_name,
    alternateContactPhone: row.alternate_contact_phone,
    addressLine2: row.address_line_2,
    county: row.county,
    countryCode: row.country_code,
    googlePlaceId: row.google_place_id,
    latitude: row.latitude,
    longitude: row.longitude,
    emailOptIn: row.email_opt_in,
    smsOptIn: row.sms_opt_in,
    marketingOptIn: row.marketing_opt_in,
  };
}

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    customerId: row.customer_id,
    registration: row.registration,
    make: row.make,
    model: row.model,
    year: row.year,
    colour: row.colour,
    mileage: row.mileage,
    motDue: row.mot_due,
    lastServiceDate: row.last_service_date,
    vin: row.vin,
    fuelType: row.fuel_type,
    engineCapacityCc: row.engine_capacity_cc,
    co2Emissions: row.co2_emissions,
    taxStatus: row.tax_status,
    taxDueDate: row.tax_due_date,
    motStatus: row.mot_status,
    monthOfFirstRegistration: row.month_of_first_registration,
    dateOfLastV5cIssued: row.date_of_last_v5c_issued,
    typeApproval: row.type_approval,
    wheelplan: row.wheelplan,
    euroStatus: row.euro_status,
    markedForExport: row.marked_for_export,
    dvlaLastCheckedAt: row.dvla_last_checked_at,
  };
}

function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    supplier: row.supplier,
    category: row.category,
    stockLevel: row.stock_level,
    reorderLevel: row.reorder_level,
    costPrice: row.cost_price,
    sellPrice: row.sell_price,
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes,
    jobType: row.job_type,
    bay: row.bay,
    technician: row.technician,
    estPrice: row.est_price,
    notes: row.notes,
    serviceDetails: (row.service_details as ServiceDetails | null) ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: (row.status as Booking["status"]) ?? "confirmed",
    employeeId: row.employee_id,
    serviceId: row.service_id,
    locationType: (row.location_type as Booking["locationType"]) ?? "garage",
    addressLine: row.address_line,
    postCode: row.post_code,
    googlePlaceId: row.google_place_id,
    latitude: row.latitude,
    longitude: row.longitude,
    source: row.source,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role as EmployeeRole,
    email: row.email,
    phone: row.phone,
    hourlyRate: row.hourly_rate,
    active: row.active,
    createdAt: row.created_at,
  };
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    title: row.title,
    dueDate: row.due_date,
    done: row.done,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapGarageSettings(row: GarageSettingsRow): GarageSettings {
  return {
    id: row.id,
    garageName: row.garage_name,
    addressLine: row.address_line,
    city: row.city,
    postCode: row.post_code,
    vatNumber: row.vat_number,
    defaultVatRate: row.default_vat_rate,
    invoicePrefix: row.invoice_prefix,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    logoUrl: row.logo_url,
    timezone: row.timezone,
    currency: row.currency,
    vatMode: row.vat_mode as GarageSettings["vatMode"],
    defaultLabourRate: row.default_labour_rate,
    calendarStartHour: row.calendar_start_hour,
    calendarEndHour: row.calendar_end_hour,
    calendarSlotMinutes: row.calendar_slot_minutes,
    allowOverlappingJobs: row.allow_overlapping_jobs,
    smartGapMinutes: row.smart_gap_minutes,
  };
}

function mapOpeningHours(row: Tables<"garage_opening_hours">): GarageOpeningHours {
  return {
    id: row.id,
    weekday: row.weekday,
    isClosed: row.is_closed,
    is24Hours: row.is_24_hours,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
  };
}

function mapClosure(row: Tables<"garage_closures">): GarageClosure {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title,
    closureType: row.closure_type,
  };
}

function mapServiceCatalogueItem(row: Tables<"service_catalogue">): ServiceCatalogueItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    defaultDurationMinutes: row.default_duration_minutes,
    defaultLabourPrice: row.default_labour_price,
    vatRate: row.vat_rate,
    active: row.active,
  };
}

function mapLabourLine(row: Tables<"job_labour_lines">): JobLabourLine {
  return {
    id: row.id,
    description: row.description,
    hours: row.hours,
    rate: row.rate,
  };
}

function mapPartLine(row: Tables<"job_part_lines">): JobPartLine {
  return {
    id: row.id,
    partId: row.part_id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
  };
}

function mapJobCard(row: JobCardRow, invoiceId?: string | null): JobCard {
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    status: row.status,
    priority: (row.priority as JobCard["priority"]) ?? "medium",
    technician: row.technician,
    createdAt: row.created_at,
    dueDate: row.due_date,
    description: row.description,
    notes: row.notes,
    labourLines: (row.job_labour_lines ?? []).map(mapLabourLine),
    partLines: (row.job_part_lines ?? []).map(mapPartLine),
    invoiceId: invoiceId ?? undefined,
    jobNumber: row.job_number,
    employeeId: row.employee_id,
    checkedInAt: row.checked_in_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    releasedAt: row.released_at,
    authorizationStatus: (row.authorization_status as JobCard["authorizationStatus"]) ?? "not_required",
    mileageIn: row.mileage_in,
    customerComplaint: row.customer_complaint,
    internalNotes: row.internal_notes,
  };
}

function mapLineItem(row: Tables<"invoice_line_items">): InvoiceLineItem {
  return {
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
  };
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    jobId: row.job_id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    date: row.date,
    dueDate: row.due_date,
    status: row.status,
    vatRate: row.vat_rate,
    notes: row.notes,
    lineItems: (row.invoice_line_items ?? []).map(mapLineItem),
  };
}

function mapEstimateLine(row: Tables<"estimate_lines">): EstimateLine {
  return {
    id: row.id,
    serviceId: row.service_id,
    lineType: row.line_type as EstimateLine["lineType"],
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    vatRate: row.vat_rate,
    lineTotal: row.line_total,
    durationMinutes: row.duration_minutes,
    sortOrder: row.sort_order,
  };
}

function mapEstimate(row: EstimateRow): Estimate {
  return {
    id: row.id,
    estimateNumber: row.estimate_number,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    status: row.status as Estimate["status"],
    issueDate: row.issue_date,
    validUntil: row.valid_until,
    notes: row.notes,
    subtotal: row.subtotal,
    vatTotal: row.vat_total,
    total: row.total,
    bookedJobId: row.booked_job_id,
    createdAt: row.created_at,
    lines: (row.estimate_lines ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapEstimateLine),
  };
}

const JOB_CARD_SELECT = "*, job_labour_lines(*), job_part_lines(*)";
const INVOICE_SELECT = "*, invoice_line_items(*)";
const ESTIMATE_SELECT = "*, estimate_lines(*)";

// ---- Customers ----

// Inclusive of archived customers — this is what every page that builds a
// customerById lookup map for existing bookings/jobs/invoices/reminders
// should use, since those records don't stop existing when their customer
// is archived. Use getActiveCustomers() instead for the customer list and
// for "create new X" selectors, where an archived customer shouldn't be
// offered.
export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("garage_id", garageId)
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomer);
}

export async function getActiveCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("garage_id", garageId)
    .eq("archived", false)
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomer);
}

export async function getArchivedCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("garage_id", garageId)
    .eq("archived", true)
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomer);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCustomer(data) : undefined;
}

// ---- Vehicles ----

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("garage_id", garageId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVehicle);
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapVehicle(data) : undefined;
}

export async function getVehiclesForCustomer(
  customerId: string
): Promise<Vehicle[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("customer_id", customerId)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVehicle);
}

// ---- Parts ----

export async function getParts(): Promise<Part[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("garage_id", garageId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPart);
}

// ---- Bookings ----

export async function getBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("garage_id", garageId)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBooking);
}

export async function getBookingsForCustomer(
  customerId: string
): Promise<Booking[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customerId)
    .eq("garage_id", garageId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBooking);
}

// ---- Job cards ----

export async function getJobCards(): Promise<JobCard[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const [{ data, error }, { data: invoiceLinks, error: invError }] =
    await Promise.all([
      supabase
        .from("job_cards")
        .select(JOB_CARD_SELECT)
        .eq("garage_id", garageId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, job_id")
        .eq("garage_id", garageId)
        .not("job_id", "is", null),
    ]);
  if (error) throw new Error(error.message);
  if (invError) throw new Error(invError.message);

  const invoiceIdByJobId = new Map(
    (invoiceLinks ?? []).map((inv) => [inv.job_id as string, inv.id])
  );

  return (data ?? []).map((row) =>
    mapJobCard(row as JobCardRow, invoiceIdByJobId.get(row.id))
  );
}

export async function getJobsForCustomer(
  customerId: string
): Promise<JobCard[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("job_cards")
    .select(JOB_CARD_SELECT)
    .eq("customer_id", customerId)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapJobCard(row as JobCardRow));
}

export async function getJob(id: string): Promise<JobCard | undefined> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const [{ data, error }, { data: invoiceLink }] = await Promise.all([
    supabase
      .from("job_cards")
      .select(JOB_CARD_SELECT)
      .eq("id", id)
      .eq("garage_id", garageId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id")
      .eq("job_id", id)
      .eq("garage_id", garageId)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return mapJobCard(data as JobCardRow, invoiceLink?.id);
}

export async function getJobStatusHistory(jobId: string): Promise<JobStatusHistoryEntry[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();

  const { data, error } = await supabase
    .from("job_status_history")
    .select("*")
    .eq("job_id", jobId)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    previousStatus: row.previous_status as JobStatusHistoryEntry["previousStatus"],
    newStatus: row.new_status as JobStatusHistoryEntry["newStatus"],
    reason: row.reason,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }));
}

// ---- Invoices ----

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("garage_id", garageId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapInvoice(row as InvoiceRow));
}

export async function getInvoicesForCustomer(
  customerId: string
): Promise<Invoice[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("customer_id", customerId)
    .eq("garage_id", garageId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapInvoice(row as InvoiceRow));
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapInvoice(data as InvoiceRow) : undefined;
}

// ---- Estimates ----

export async function getEstimates(): Promise<Estimate[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_SELECT)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapEstimate(row as EstimateRow));
}

export async function getEstimatesForCustomer(customerId: string): Promise<Estimate[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_SELECT)
    .eq("customer_id", customerId)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapEstimate(row as EstimateRow));
}

export async function getEstimate(id: string): Promise<Estimate | undefined> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_SELECT)
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapEstimate(data as EstimateRow) : undefined;
}

// ---- Employees ----

export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("garage_id", garageId)
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEmployee);
}

// ---- Reminders ----

export async function getReminders(): Promise<Reminder[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("garage_id", garageId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReminder);
}

// ---- Garage settings ----

export async function getGarageSettings(): Promise<GarageSettings> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("garage_settings")
    .select("*")
    .eq("id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapGarageSettings(data);
  return {
    id: "",
    garageName: "My Garage Ltd",
    addressLine: "",
    city: "",
    postCode: "",
    vatNumber: "",
    defaultVatRate: 20,
    invoicePrefix: "INV",
  };
}

export async function getGarageOpeningHours(): Promise<GarageOpeningHours[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("garage_opening_hours")
    .select("*")
    .eq("garage_id", garageId)
    .order("weekday", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOpeningHours);
}

export async function getGarageClosures(): Promise<GarageClosure[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("garage_closures")
    .select("*")
    .eq("garage_id", garageId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapClosure);
}

export async function getServiceCatalogue(): Promise<ServiceCatalogueItem[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("service_catalogue")
    .select("*")
    .eq("garage_id", garageId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapServiceCatalogueItem);
}

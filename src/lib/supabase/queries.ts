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
  ProductType,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  Reminder,
  ReminderChannel,
  ReminderSettings,
  ReminderStatus,
  ReminderType,
  ServiceDetails,
  StockMovement,
  StockMovementType,
  EmployeeLeave,
  LeaveType,
  LeaveStatus,
  CreditNote,
  CreditNoteLineItem,
  CreditNoteStatus,
  FeedbackChannel,
  FeedbackRequest,
  FeedbackRequestStatus,
  FeedbackStats,
  Supplier,
  Vehicle,
  VhcCheck,
  VhcItem,
  VhcItemResult,
  VhcCheckStatus,
  VhcTemplate,
  VhcTemplateItem,
  Warehouse,
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
  invoice_jobs: Tables<"invoice_jobs">[];
};
type CreditNoteRow = Tables<"credit_notes"> & {
  credit_note_line_items: Tables<"credit_note_line_items">[];
};
type EstimateRow = Tables<"estimates"> & {
  estimate_lines: Tables<"estimate_lines">[];
};
type PurchaseOrderRow = Tables<"purchase_orders"> & {
  purchase_order_lines: Tables<"purchase_order_lines">[];
};
type VhcCheckRow = Tables<"vhc_checks"> & {
  vhc_items: Tables<"vhc_items">[];
};
type VhcTemplateRow = Tables<"vhc_templates"> & {
  vhc_template_items: Tables<"vhc_template_items">[];
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
    supplierId: row.supplier_id,
    category: row.category,
    productType: (row.product_type as ProductType) ?? "part",
    stockLevel: row.stock_level,
    reorderLevel: row.reorder_level,
    costPrice: row.cost_price,
    sellPrice: row.sell_price,
    defaultWarehouseId: row.default_warehouse_id,
    tyreWidth: row.tyre_width,
    tyreProfile: row.tyre_profile,
    tyreRimSize: row.tyre_rim_size,
    tyreLoadIndex: row.tyre_load_index,
    tyreSpeedRating: row.tyre_speed_rating,
  };
}

function mapSupplier(row: Tables<"suppliers">): Supplier {
  return {
    id: row.id,
    name: row.name,
    accountNumber: row.account_number,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    postcode: row.postcode,
    notes: row.notes,
  };
}

function mapWarehouse(row: Tables<"warehouses">): Warehouse {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    postcode: row.postcode,
    notes: row.notes,
  };
}

function mapStockMovement(row: Tables<"stock_movements">): StockMovement {
  return {
    id: row.id,
    partId: row.part_id,
    warehouseId: row.warehouse_id,
    movementType: row.movement_type as StockMovementType,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapPurchaseOrderLine(row: Tables<"purchase_order_lines">): PurchaseOrderLine {
  return {
    id: row.id,
    partId: row.part_id,
    description: row.description,
    quantityOrdered: row.quantity_ordered,
    quantityReceived: row.quantity_received,
    unitCost: row.unit_cost,
  };
}

function mapPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    warehouseId: row.warehouse_id,
    status: row.status as PurchaseOrderStatus,
    orderDate: row.order_date,
    expectedDate: row.expected_date,
    notes: row.notes,
    createdAt: row.created_at,
    lines: (row.purchase_order_lines ?? []).map(mapPurchaseOrderLine),
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
    reminderType: row.reminder_type as ReminderType,
    channel: row.channel as ReminderChannel,
    status: row.status as ReminderStatus,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    cancelledAt: row.cancelled_at,
    errorMessage: row.error_message,
  };
}

function mapReminderSettings(row: Tables<"reminder_settings">): ReminderSettings {
  return {
    id: row.id,
    reminderType: row.reminder_type as ReminderType,
    enabled: row.enabled,
    daysBefore: row.days_before,
    hoursBefore: row.hours_before,
    emailEnabled: row.email_enabled,
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
    jobIds: (row.invoice_jobs ?? []).map((link) => link.job_id),
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
const INVOICE_SELECT = "*, invoice_line_items(*), invoice_jobs(job_id)";
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

// ---- Suppliers ----

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("garage_id", garageId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSupplier);
}

// ---- Warehouses ----

export async function getWarehouses(): Promise<Warehouse[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("garage_id", garageId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapWarehouse);
}

// ---- Stock movements ----

export async function getStockMovementsForPart(partId: string): Promise<StockMovement[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("garage_id", garageId)
    .eq("part_id", partId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapStockMovement);
}

// ---- Purchase orders ----

const PURCHASE_ORDER_SELECT = "*, purchase_order_lines(*)";

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPurchaseOrder(row as PurchaseOrderRow));
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPurchaseOrder(data as PurchaseOrderRow) : null;
}

// ---- VHC (Vehicle Health Check) ----

function mapVhcItem(row: Tables<"vhc_items">): VhcItem {
  return {
    id: row.id,
    vhcCheckId: row.vhc_check_id,
    category: row.category,
    label: row.label,
    result: row.result as VhcItemResult,
    notes: row.notes,
    photoPaths: row.photo_paths ?? [],
    estimateLineId: row.estimate_line_id,
    sortOrder: row.sort_order,
  };
}

function mapVhcCheck(row: VhcCheckRow): VhcCheck {
  return {
    id: row.id,
    jobId: row.job_id,
    templateId: row.template_id,
    status: row.status as VhcCheckStatus,
    technicianId: row.technician_id,
    notes: row.notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    sentAt: row.sent_at,
    items: (row.vhc_items ?? [])
      .map(mapVhcItem)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function mapVhcTemplateItem(row: Tables<"vhc_template_items">): VhcTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    category: row.category,
    label: row.label,
    sortOrder: row.sort_order,
  };
}

function mapVhcTemplate(row: VhcTemplateRow): VhcTemplate {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    items: (row.vhc_template_items ?? [])
      .map(mapVhcTemplateItem)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

const VHC_CHECK_SELECT = "*, vhc_items(*)";
const VHC_TEMPLATE_SELECT = "*, vhc_template_items(*)";

export async function getVhcTemplates(): Promise<VhcTemplate[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vhc_templates")
    .select(VHC_TEMPLATE_SELECT)
    .eq("garage_id", garageId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapVhcTemplate(row as VhcTemplateRow));
}

export async function getVhcChecksForJob(jobId: string): Promise<VhcCheck[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vhc_checks")
    .select(VHC_CHECK_SELECT)
    .eq("job_id", jobId)
    .eq("garage_id", garageId)
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapVhcCheck(row as VhcCheckRow));
}

export async function getVhcCheck(id: string): Promise<VhcCheck | null> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("vhc_checks")
    .select(VHC_CHECK_SELECT)
    .eq("id", id)
    .eq("garage_id", garageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapVhcCheck(data as VhcCheckRow) : null;
}

// ---- Feedback ----

function mapFeedbackRequest(
  row: Tables<"feedback_requests">,
  response?: Tables<"feedback_responses">
): FeedbackRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    customerId: row.customer_id,
    token: row.token,
    status: row.status as FeedbackRequestStatus,
    channel: row.channel as FeedbackChannel,
    sentAt: row.sent_at,
    openedAt: row.opened_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
    npsScore: response?.nps_score ?? null,
    comment: response?.comment ?? null,
  };
}

export async function getFeedbackRequestsForJob(jobId: string): Promise<FeedbackRequest[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("feedback_requests")
    .select("*, feedback_responses(*)")
    .eq("job_id", jobId)
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const responses = row.feedback_responses as unknown as Tables<"feedback_responses">[] | null;
    return mapFeedbackRequest(row, responses?.[0]);
  });
}

export async function getFeedbackRequests(): Promise<FeedbackRequest[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("feedback_requests")
    .select("*, feedback_responses(*)")
    .eq("garage_id", garageId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const responses = row.feedback_responses as unknown as Tables<"feedback_responses">[] | null;
    return mapFeedbackRequest(row, responses?.[0]);
  });
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("feedback_responses")
    .select("nps_score")
    .eq("garage_id", garageId);
  if (error) throw new Error(error.message);

  const scores = (data ?? []).map((r) => r.nps_score);
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const passives = scores.length - promoters - detractors;
  const npsScore =
    scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

  return { totalResponses: scores.length, promoters, passives, detractors, npsScore };
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
        .from("invoice_jobs")
        .select("invoice_id, job_id")
        .eq("garage_id", garageId),
    ]);
  if (error) throw new Error(error.message);
  if (invError) throw new Error(invError.message);

  const invoiceIdByJobId = new Map(
    (invoiceLinks ?? []).map((link) => [link.job_id, link.invoice_id])
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
  const [{ data, error }, { data: invoiceLinks, error: invError }] =
    await Promise.all([
      supabase
        .from("job_cards")
        .select(JOB_CARD_SELECT)
        .eq("customer_id", customerId)
        .eq("garage_id", garageId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoice_jobs")
        .select("invoice_id, job_id")
        .eq("garage_id", garageId),
    ]);
  if (error) throw new Error(error.message);
  if (invError) throw new Error(invError.message);

  const invoiceIdByJobId = new Map(
    (invoiceLinks ?? []).map((link) => [link.job_id, link.invoice_id])
  );

  return (data ?? []).map((row) =>
    mapJobCard(row as JobCardRow, invoiceIdByJobId.get(row.id))
  );
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
      .from("invoice_jobs")
      .select("invoice_id")
      .eq("job_id", id)
      .eq("garage_id", garageId)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return mapJobCard(data as JobCardRow, invoiceLink?.invoice_id);
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

// ---- Credit notes ----

function mapCreditNoteLine(row: Tables<"credit_note_line_items">): CreditNoteLineItem {
  return {
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
  };
}

function mapCreditNote(row: CreditNoteRow): CreditNote {
  return {
    id: row.id,
    number: row.number,
    invoiceId: row.invoice_id,
    customerId: row.customer_id,
    date: row.date,
    status: row.status as CreditNoteStatus,
    reason: row.reason,
    vatRate: row.vat_rate,
    notes: row.notes,
    lineItems: (row.credit_note_line_items ?? []).map(mapCreditNoteLine),
  };
}

const CREDIT_NOTE_SELECT = "*, credit_note_line_items(*)";

export async function getCreditNotesForInvoice(invoiceId: string): Promise<CreditNote[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("credit_notes")
    .select(CREDIT_NOTE_SELECT)
    .eq("invoice_id", invoiceId)
    .eq("garage_id", garageId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCreditNote(row as CreditNoteRow));
}

export async function getCreditNotes(): Promise<CreditNote[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("credit_notes")
    .select(CREDIT_NOTE_SELECT)
    .eq("garage_id", garageId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCreditNote(row as CreditNoteRow));
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

// ---- Employee leave ----

function mapEmployeeLeave(row: Tables<"employee_leave">): EmployeeLeave {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type as LeaveType,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status as LeaveStatus,
    notes: row.notes,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export async function getEmployeeLeave(): Promise<EmployeeLeave[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("employee_leave")
    .select("*")
    .eq("garage_id", garageId)
    .order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEmployeeLeave);
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

export async function getReminderSettings(): Promise<ReminderSettings[]> {
  const supabase = await createClient();
  const garageId = await getCurrentGarageId();
  const { data, error } = await supabase
    .from("reminder_settings")
    .select("*")
    .eq("garage_id", garageId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReminderSettings);
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

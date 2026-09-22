export type JobStatus =
  | "booked"
  | "checked_in"
  | "in_progress"
  | "awaiting_parts"
  | "awaiting_authorisation"
  | "authorised"
  | "completed"
  | "vehicle_released"
  | "cancelled"
  /** @deprecated Invoice state comes from the linked invoice, not the job status. Kept only to type historic rows. */
  | "invoiced";

export type JobPriority = "low" | "medium" | "high";

export type InvoiceStatus = "estimate" | "draft" | "sent" | "paid" | "overdue";

export type JobType =
  | "vehicle_recovery"
  | "diagnostic"
  | "oil_service"
  | "full_service"
  | "mot"
  | "tyre_replacement"
  | "vehicle_storage"
  | "mobile_tyre_fitting"
  | "battery_replacement"
  | "other";

export interface Vehicle {
  id: string;
  customerId: string;
  registration: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  mileage: number | null;
  motDue: string | null; // ISO date
  lastServiceDate: string | null;
  // DVLA Vehicle Enquiry Service fields — populated only after a lookup is
  // confirmed by the user (see src/lib/dvla). All optional: manual vehicle
  // entry never depends on these.
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

export type CustomerType = "individual" | "business";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postCode: string;
  createdAt: string;
  notes?: string | null;
  archived: boolean;
  // Structured fields (spec 5.4) — optional until every read path is
  // migrated off the single full_name/address_line fields above.
  customerType?: CustomerType;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  alternateContactName?: string | null;
  alternateContactPhone?: string | null;
  addressLine2?: string | null;
  county?: string | null;
  countryCode?: string;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  emailOptIn?: boolean;
  smsOptIn?: boolean;
  marketingOptIn?: boolean;
}

/** Display name per spec 5.4: business name, else first+last, else full_name. */
export function customerDisplayName(customer: Customer): string {
  if (customer.customerType === "business" && customer.businessName) {
    return customer.businessName;
  }
  if (customer.firstName || customer.lastName) {
    return [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  }
  return customer.name;
}

export type TyreCondition = "new" | "part_worn";
export type Transmission = "automatic" | "manual";
export type YesNo = "yes" | "no";

export interface TyreReplacementDetails {
  tyreCondition: TyreCondition;
  tyreSize: string;
  quantity: number;
}

export interface VehicleStorageDetails {
  startDate: string | null;
  neededBy: string | null;
  dailyRate: number | null;
}

export interface MobileTyreFittingDetails {
  location: string;
  registration: string;
  tyreSize: string;
  quantity: number;
}

export interface BatteryReplacementDetails {
  batteryCode: string;
}

export interface VehicleRecoveryDetails {
  pickupLocation: string;
  registration: string;
  transmission: Transmission;
  canRoll: YesNo;
  passengers: number;
  dropoffAddress: string;
}

export type ServiceDetails =
  | ({ jobType: "tyre_replacement" } & TyreReplacementDetails)
  | ({ jobType: "vehicle_storage" } & VehicleStorageDetails)
  | ({ jobType: "mobile_tyre_fitting" } & MobileTyreFittingDetails)
  | ({ jobType: "battery_replacement" } & BatteryReplacementDetails)
  | ({ jobType: "vehicle_recovery" } & VehicleRecoveryDetails);

export type BookingStatus = "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";
export type BookingLocationType = "garage" | "customer_address" | "other";

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string | null;
  date: string; // ISO date (yyyy-mm-dd)
  time: string | null; // HH:mm
  durationMinutes: number | null;
  jobType: JobType;
  bay: string | null;
  technician: string | null;
  estPrice: number | null;
  notes?: string | null;
  serviceDetails?: ServiceDetails | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: BookingStatus;
  employeeId?: string | null;
  serviceId?: string | null;
  locationType?: BookingLocationType;
  addressLine?: string | null;
  postCode?: string | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source?: string;
}

export interface JobLabourLine {
  id: string;
  description: string;
  hours: number;
  rate: number;
}

export interface JobPartLine {
  id: string;
  partId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type JobAuthorizationStatus = "not_required" | "awaiting" | "authorised" | "declined";

export interface JobCard {
  id: string;
  bookingId?: string | null;
  customerId: string;
  vehicleId: string | null;
  status: JobStatus;
  priority: JobPriority;
  technician: string | null;
  createdAt: string;
  dueDate: string | null;
  description: string | null;
  labourLines: JobLabourLine[];
  partLines: JobPartLine[];
  notes?: string | null;
  invoiceId?: string;
  jobNumber?: string | null;
  employeeId?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  releasedAt?: string | null;
  authorizationStatus?: JobAuthorizationStatus;
  mileageIn?: number | null;
  customerComplaint?: string | null;
  internalNotes?: string | null;
}

export interface JobStatusHistoryEntry {
  id: string;
  jobId: string;
  previousStatus: JobStatus | null;
  newStatus: JobStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  jobId?: string | null;
  customerId: string;
  vehicleId: string | null;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  vatRate: number;
  notes?: string | null;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  supplier: string | null;
  category: string | null;
  stockLevel: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
}

export type EmployeeRole =
  | "technician"
  | "service_advisor"
  | "manager"
  | "apprentice"
  | "other";

export interface Employee {
  id: string;
  fullName: string;
  role: EmployeeRole;
  email: string | null;
  phone: string | null;
  hourlyRate: number;
  active: boolean;
  createdAt: string;
  userId?: string | null;
  colour?: string | null;
  specialties?: string[];
  defaultWorkingStart?: string | null;
  defaultWorkingEnd?: string | null;
  archivedAt?: string | null;
}

export interface EmployeeWorkingHours {
  id: string;
  employeeId: string;
  weekday: number; // 0 (Sunday) – 6 (Saturday)
  isWorking: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface Reminder {
  id: string;
  customerId: string | null;
  vehicleId: string | null;
  title: string;
  dueDate: string;
  done: boolean;
  notes: string | null;
  createdAt: string;
}

export type VatMode = "not_registered" | "inclusive" | "exclusive";

export interface GarageSettings {
  id: string;
  garageName: string;
  addressLine: string;
  city: string;
  postCode: string;
  vatNumber: string;
  defaultVatRate: number;
  invoicePrefix: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  timezone?: string;
  currency?: string;
  vatMode?: VatMode;
  defaultLabourRate?: number;
  calendarStartHour?: number;
  calendarEndHour?: number;
  calendarSlotMinutes?: number;
  allowOverlappingJobs?: boolean;
  smartGapMinutes?: number;
}

export interface GarageOpeningHours {
  id: string;
  weekday: number;
  isClosed: boolean;
  is24Hours: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface GarageClosure {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string | null;
  closureType: string;
}

export interface ServiceCatalogueItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultDurationMinutes: number;
  defaultLabourPrice: number | null;
  vatRate: number | null;
  active: boolean;
}

export interface VehicleMileageEntry {
  id: string;
  vehicleId: string;
  jobId: string | null;
  mileage: number;
  recordedAt: string;
}

export type GarageRole = "owner" | "manager" | "service_advisor" | "technician";

export interface Garage {
  id: string;
  name: string;
  role: GarageRole;
}

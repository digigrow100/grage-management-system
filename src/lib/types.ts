export type JobStatus =
  | "booked"
  | "checked_in"
  | "in_progress"
  | "awaiting_parts"
  | "completed"
  | "vehicle_released"
  | "invoiced"
  | "awaiting_authorisation"
  | "authorised"
  | "cancelled";

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
}

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
  emailOptIn: boolean;
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
  costPrice: number;
}

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
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoicePayment {
  id: string; amount: number; paidOn: string; method: string; reference: string | null;
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
  payments: InvoicePayment[];
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

export interface GarageSettings {
  id: string;
  timezone: string;
  garageName: string;
  addressLine: string;
  city: string;
  postCode: string;
  vatNumber: string;
  defaultVatRate: number;
  invoicePrefix: string;
}

export type GarageRole = string;

export interface Garage {
  id: string;
  name: string;
  role: GarageRole;
}

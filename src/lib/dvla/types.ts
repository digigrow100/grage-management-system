export interface DvlaVehicleResponse {
  registrationNumber: string;
  make?: string;
  colour?: string;
  fuelType?: string;
  engineCapacity?: number;
  co2Emissions?: number;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  monthOfFirstRegistration?: string;
  dateOfLastV5CIssued?: string;
  typeApproval?: string;
  wheelplan?: string;
  euroStatus?: string;
  markedForExport?: boolean;
  yearOfManufacture?: number;
  [key: string]: unknown;
}

export interface DvlaLookupErrorBody {
  errors?: { status?: string; code?: string; title?: string; detail?: string }[];
}

export type DvlaLookupResult =
  | { ok: true; vehicle: DvlaVehicleResponse }
  | { ok: false; status: "not_configured" | "not_found" | "invalid" | "rate_limited" | "upstream_error"; message: string };

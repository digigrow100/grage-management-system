"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  DoorOpen,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Mail,
  Percent,
  Phone,
  Plus,
  PoundSterling,
  Receipt,
  Search,
  Timer,
  Trash2,
  User,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, FieldSection, Select, TextArea, TextInput } from "@/components/ui/Field";
import { AddressAutocomplete, EMPTY_ADDRESS, type AddressValue } from "@/components/forms/AddressAutocomplete";
import { ServiceSpecificFields } from "@/components/forms/ServiceSpecificFields";
import {
  VehicleFields,
  emptyDraft as emptyVehicleDraft,
  applyDvlaResult,
  type DvlaVehicleSummary,
} from "@/components/forms/VehicleFormModal";
import {
  addBooking,
  addCustomer,
  addInvoice,
  addVehicle,
  updateJobLines,
  type VehicleInput,
} from "@/lib/supabase/mutations";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/job-types";
import { JOB_PRIORITIES, JOB_PRIORITY_LABELS } from "@/lib/job-status";
import {
  EMPTY_STORAGE_VALUES,
  buildServiceDetails,
  defaultServiceValues,
  storageTotal,
  type ServiceFieldValues,
  type StorageFormValues,
} from "@/lib/service-fields";
import { formatCurrency } from "@/lib/format";
import type { BookingLocationType, CustomerType, Employee, JobPriority, JobType, Part } from "@/lib/types";
import { cn } from "@/lib/cn";

type WizardStep = "customer" | "vehicle" | "booking" | "items" | "invoice";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "vehicle", label: "Vehicle" },
  { key: "booking", label: "Booking" },
  { key: "items", label: "Items" },
  { key: "invoice", label: "Invoice" },
];

interface DraftLabourLine {
  id: string;
  description: string;
  hours: number;
  rate: number;
}
interface DraftPartLine {
  id: string;
  partId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}
interface DraftInvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

let seq = 0;
function newLabourLine(): DraftLabourLine {
  seq += 1;
  return { id: `nl_${seq}`, description: "", hours: 1, rate: 0 };
}
function newPartLine(): DraftPartLine {
  seq += 1;
  return { id: `np_${seq}`, partId: null, description: "", quantity: 1, unitPrice: 0 };
}
function newInvoiceLine(description = "", quantity = 1, unitPrice = 0): DraftInvoiceLine {
  seq += 1;
  return { id: `ni_${seq}`, description, quantity, unitPrice };
}

export function AddCustomerButton({
  employees = [],
  parts = [],
  defaultVatRate = 20,
  triggerClassName,
  children,
}: {
  employees?: Employee[];
  parts?: Part[];
  defaultVatRate?: number;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carried across steps once created.
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [jobId, setJobId] = useState("");

  // Step: customer
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);

  // Step: vehicle
  const [vehicleDraft, setVehicleDraft] = useState<VehicleInput>(emptyVehicleDraft());
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Step: booking
  const [jobType, setJobType] = useState<JobType | "">("");
  const [estPrice, setEstPrice] = useState("");
  const [serviceValues, setServiceValues] = useState<ServiceFieldValues>({});
  const [storageValues, setStorageValues] = useState<StorageFormValues>(EMPTY_STORAGE_VALUES);
  const [locationType, setLocationType] = useState<BookingLocationType>("garage");
  const [location, setLocation] = useState<AddressValue>(EMPTY_ADDRESS);
  const activeEmployees = employees.filter((e) => e.active);

  // Step: items
  const [labourLines, setLabourLines] = useState<DraftLabourLine[]>([newLabourLine()]);
  const [partLines, setPartLines] = useState<DraftPartLine[]>([]);
  const partById = new Map(parts.map((p) => [p.id, p]));

  // Step: invoice
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [invoiceLines, setInvoiceLines] = useState<DraftInvoiceLine[]>([newInvoiceLine()]);

  const storageError =
    jobType === "vehicle_storage" &&
    storageValues.startDate &&
    storageValues.neededBy &&
    storageValues.neededBy < storageValues.startDate
      ? "Needed By date cannot be earlier than Start Date."
      : null;

  function resetAll() {
    setStep("customer");
    setCustomerId("");
    setCustomerName("");
    setVehicleId("");
    setJobId("");
    setCustomerType("individual");
    setAddress(EMPTY_ADDRESS);
    setVehicleDraft(emptyVehicleDraft());
    setLookupState("idle");
    setLookupError(null);
    setJobType("");
    setEstPrice("");
    setServiceValues({});
    setStorageValues(EMPTY_STORAGE_VALUES);
    setLocationType("garage");
    setLocation(EMPTY_ADDRESS);
    setLabourLines([newLabourLine()]);
    setPartLines([]);
    setVatRate(defaultVatRate);
    setInvoiceLines([newInvoiceLine()]);
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    resetAll();
    router.refresh();
  }

  function handleJobTypeChange(next: string) {
    const nextType = next as JobType | "";
    const wasStorage = jobType === "vehicle_storage";
    setJobType(nextType);
    setServiceValues(defaultServiceValues(nextType));
    setStorageValues(EMPTY_STORAGE_VALUES);
    if (wasStorage && nextType !== "vehicle_storage") setEstPrice("");
  }

  async function handleLookup() {
    if (!vehicleDraft.registration.trim()) return;
    setLookupState("loading");
    setLookupError(null);
    try {
      const response = await fetch("/api/vehicles/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: vehicleDraft.registration }),
      });
      const body = await response.json();
      if (!response.ok) {
        setLookupState(response.status === 404 ? "not_found" : "idle");
        setLookupError(body.error ?? "Lookup failed.");
        return;
      }
      setVehicleDraft((d) => applyDvlaResult(d, body.vehicle as DvlaVehicleSummary));
      setLookupState("found");
    } catch {
      setLookupState("idle");
      setLookupError("Lookup failed. Enter the vehicle manually.");
    }
  }

  // ---- Step 1: customer ----
  async function handleCustomerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    const fullName =
      customerType === "business" ? businessName : [firstName, lastName].filter(Boolean).join(" ");

    const result = await addCustomer({
      customerType,
      fullName,
      firstName: customerType === "individual" ? firstName : undefined,
      lastName: customerType === "individual" ? lastName : undefined,
      businessName: customerType === "business" ? businessName : undefined,
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: address.addressLine,
      addressLine2: address.addressLine2,
      city: address.city,
      county: address.county,
      postCode: address.postCode,
      countryCode: address.countryCode,
      googlePlaceId: address.googlePlaceId,
      latitude: address.latitude,
      longitude: address.longitude,
      emailOptIn: formData.get("emailOptIn") === "on",
      smsOptIn: formData.get("smsOptIn") === "on",
      marketingOptIn: formData.get("marketingOptIn") === "on",
    });

    setSubmitting(false);
    if (result.error || !result.id) {
      setError(result.error ?? "Could not create customer.");
      return;
    }

    setCustomerId(result.id);
    setCustomerName(fullName);
    setStep("vehicle");
  }

  // ---- Step 2: vehicle ----
  async function handleVehicleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addVehicle(customerId, {
      ...vehicleDraft,
      registration: String(formData.get("registration") ?? vehicleDraft.registration),
      make: String(formData.get("make") ?? vehicleDraft.make ?? ""),
      model: String(formData.get("model") ?? vehicleDraft.model ?? ""),
      colour: String(formData.get("colour") ?? vehicleDraft.colour ?? ""),
    });

    setSubmitting(false);
    if (result.error || !result.id) {
      setError(result.error ?? "Could not add vehicle.");
      return;
    }

    setVehicleId(result.id);
    setStep("booking");
  }

  function skipVehicle() {
    setStep("booking");
  }

  // ---- Step 3: booking ----
  async function handleBookingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (jobType === "vehicle_storage" && storageError) {
      setError(storageError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const serviceDetails = buildServiceDetails(jobType, serviceValues, storageValues);
    const employeeId = String(formData.get("employeeId") ?? "");
    const employee = activeEmployees.find((emp) => emp.id === employeeId);

    const result = await addBooking({
      customerId,
      jobType: jobType as JobType,
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      durationMinutes: formData.get("durationMinutes") ? Number(formData.get("durationMinutes")) : undefined,
      estPrice: estPrice ? Number(estPrice) : undefined,
      priority: String(formData.get("priority") ?? "medium") as JobPriority,
      technician: employee?.fullName ?? "",
      employeeId: employeeId || undefined,
      bay: String(formData.get("bay") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      serviceDetails,
      locationType,
      addressLine: location.addressLine,
      postCode: location.postCode,
      googlePlaceId: location.googlePlaceId,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    setSubmitting(false);
    if (result.error || !result.jobId) {
      setError(result.error ?? "Could not create booking.");
      return;
    }

    setJobId(result.jobId);
    // Seed the estimate price as a first invoice line so it isn't lost if
    // no items are added in the next step.
    if (estPrice && Number(estPrice) > 0) {
      setInvoiceLines([newInvoiceLine(JOB_TYPE_LABELS[jobType as JobType] ?? "Estimated work", 1, Number(estPrice))]);
    }
    setStep("items");
  }

  function skipBooking() {
    setStep("invoice");
  }

  // ---- Step 4: job items (labour/parts) ----
  function updateLabourLine(id: string, patch: Partial<DraftLabourLine>) {
    setLabourLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLabourLine(id: string) {
    setLabourLines((lines) => (lines.length > 1 ? lines.filter((l) => l.id !== id) : lines));
  }
  function updatePartLine(id: string, patch: Partial<DraftPartLine>) {
    setPartLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removePartLine(id: string) {
    setPartLines((lines) => lines.filter((l) => l.id !== id));
  }
  function selectPart(id: string, partId: string) {
    const part = partById.get(partId);
    updatePartLine(id, {
      partId: partId || null,
      description: part ? part.name : "",
      unitPrice: part ? part.sellPrice : 0,
    });
  }

  async function handleItemsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const cleanLabour = labourLines.filter((l) => l.description.trim());
    const cleanParts = partLines.filter((l) => l.description.trim());

    const result = await updateJobLines(jobId, {
      labourLines: cleanLabour.map(({ description, hours, rate }) => ({ description, hours, rate })),
      partLines: cleanParts.map(({ partId, description, quantity, unitPrice }) => ({
        partId,
        description,
        quantity,
        unitPrice,
      })),
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    // Pre-fill the invoice with exactly what was just saved on the job.
    setInvoiceLines(() => {
      const fromJob = [
        ...cleanLabour.map((l) => newInvoiceLine(l.description, l.hours, l.rate)),
        ...cleanParts.map((l) => newInvoiceLine(l.description, l.quantity, l.unitPrice)),
      ];
      return fromJob.length > 0 ? fromJob : invoiceLines;
    });
    setStep("invoice");
  }

  function skipItems() {
    setStep("invoice");
  }

  // ---- Step 5: invoice ----
  const subtotal = invoiceLines.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  function updateInvoiceLine(id: string, patch: Partial<DraftInvoiceLine>) {
    setInvoiceLines((items) => items.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }
  function addInvoiceLine() {
    setInvoiceLines((items) => [...items, newInvoiceLine()]);
  }
  function removeInvoiceLine(id: string) {
    setInvoiceLines((items) => (items.length > 1 ? items.filter((li) => li.id !== id) : items));
  }

  async function handleInvoiceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addInvoice({
      customerId,
      vehicleId,
      invoiceDate: String(formData.get("invoiceDate") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      vatRate,
      status: "draft",
      notes: String(formData.get("notes") ?? ""),
      lineItems: invoiceLines.map(({ description, quantity, unitPrice }) => ({
        description,
        quantity,
        unitPrice,
      })),
      jobIds: jobId ? [jobId] : undefined,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    // Close the wizard and go straight to the new invoice's own preview —
    // where it can be downloaded or edited further — instead of leaving
    // the user back on whatever page they opened the wizard from.
    setOpen(false);
    resetAll();
    if (result.id) {
      router.push(`/invoices/${result.id}`);
    } else {
      router.refresh();
    }
  }

  function skipInvoice() {
    handleClose();
  }

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
        }
      >
        {children ?? (
          <>
            <Plus size={15} /> New customer
          </>
        )}
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={STEPS[currentIndex]?.label ?? "Add Customer"}
        subtitle={
          step === "customer"
            ? "Create a new customer record"
            : step === "vehicle"
              ? `Add a vehicle for ${customerName || "this customer"}`
              : step === "booking"
                ? "Schedule a booking for this vehicle"
                : step === "items"
                  ? "Add labour and parts to the job"
                  : "Review and create the invoice"
        }
        icon={
          step === "customer"
            ? UserPlus
            : step === "booking"
              ? CalendarClock
              : step === "items"
                ? ListChecks
                : step === "invoice"
                  ? Receipt
                  : UserPlus
        }
        maxWidth="max-w-2xl"
      >
        <div className="mb-5 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 flex-1 items-center justify-center rounded-full text-xs font-medium",
                  i < currentIndex
                    ? "bg-accent-100 text-accent-700"
                    : i === currentIndex
                      ? "bg-accent-600 text-white"
                      : "bg-slate-100 text-slate-400"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {step === "customer" ? (
          <form className="space-y-6" onSubmit={handleCustomerSubmit}>
            <FieldSection title="Customer type">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType("individual")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    customerType === "individual"
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <User size={15} /> Individual
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType("business")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    customerType === "business"
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Users size={15} /> Business
                </button>
              </div>
            </FieldSection>

            <FieldSection title="Personal details">
              {customerType === "individual" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldGroup label="First name" htmlFor="firstName" required>
                    <TextInput id="firstName" name="firstName" icon={User} required placeholder="James" />
                  </FieldGroup>
                  <FieldGroup label="Last name" htmlFor="lastName" required>
                    <TextInput id="lastName" name="lastName" required placeholder="Whitfield" />
                  </FieldGroup>
                </div>
              ) : (
                <FieldGroup label="Business name" htmlFor="businessName" required>
                  <TextInput
                    id="businessName"
                    name="businessName"
                    icon={Building2}
                    required
                    placeholder="Whitfield Logistics Ltd"
                  />
                </FieldGroup>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldGroup label="Email" htmlFor="email" required>
                  <TextInput id="email" name="email" type="email" icon={Mail} required placeholder="james@example.com" />
                </FieldGroup>
                <FieldGroup label="Phone Number" htmlFor="phone" required>
                  <TextInput id="phone" name="phone" type="tel" icon={Phone} required placeholder="07700 900123" />
                </FieldGroup>
              </div>
            </FieldSection>

            <FieldSection title="Address">
              <AddressAutocomplete value={address} onChange={setAddress} />
            </FieldSection>

            <FieldSection title="Communication preferences">
              <div className="space-y-2 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="emailOptIn" defaultChecked className="rounded border-slate-300" />
                  Email reminders and updates
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="smsOptIn" className="rounded border-slate-300" />
                  SMS reminders and updates
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="marketingOptIn" className="rounded border-slate-300" />
                  Marketing communications
                </label>
              </div>
            </FieldSection>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add Customer & Continue"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "vehicle" ? (
          <form className="space-y-6" onSubmit={handleVehicleSubmit}>
            <FieldSection title="Registration">
              <FieldGroup label="Registration number" htmlFor="registration" required>
                <div className="flex gap-2">
                  <TextInput
                    id="registration"
                    name="registration"
                    required
                    className="uppercase"
                    value={vehicleDraft.registration}
                    onChange={(e) => {
                      setVehicleDraft({ ...vehicleDraft, registration: e.target.value });
                      setLookupState("idle");
                    }}
                    placeholder="LM19 XYZ"
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupState === "loading" || !vehicleDraft.registration.trim()}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {lookupState === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Find vehicle
                  </button>
                </div>
                {lookupState === "found" ? (
                  <p className="flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 size={13} /> Found — review and confirm below.
                  </p>
                ) : null}
                {lookupError ? <p className="text-xs text-amber-700">{lookupError}</p> : null}
              </FieldGroup>
            </FieldSection>

            <VehicleFields draft={vehicleDraft} setDraft={setVehicleDraft} />

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={skipVehicle}
                className="mr-auto text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add Vehicle & Continue"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "booking" ? (
          <form className="space-y-5" onSubmit={handleBookingSubmit}>
            <FieldGroup label="Job Type" htmlFor="jobType" required>
              <Select
                id="jobType"
                name="jobType"
                icon={ClipboardList}
                required
                value={jobType}
                onChange={(e) => handleJobTypeChange(e.target.value)}
              >
                <option value="" disabled>
                  Select a job type
                </option>
                {JOB_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {JOB_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            {jobType ? (
              <ServiceSpecificFields
                jobType={jobType}
                values={serviceValues}
                onChange={(name, value) => setServiceValues((prev) => ({ ...prev, [name]: value }))}
                storageValues={storageValues}
                onStorageChange={(patch) =>
                  setStorageValues((prev) => {
                    const next = { ...prev, ...patch };
                    const totalVal = storageTotal(next);
                    setEstPrice(totalVal !== null ? totalVal.toFixed(2) : "");
                    return next;
                  })
                }
                storageError={storageError}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldGroup label="Date" htmlFor="date" required>
                <TextInput id="date" name="date" type="date" icon={CalendarClock} required />
              </FieldGroup>
              <FieldGroup label="Time" htmlFor="time" required>
                <TextInput id="time" name="time" type="time" icon={Clock} required defaultValue="09:00" />
              </FieldGroup>
              <FieldGroup label="Duration (mins)" htmlFor="durationMinutes">
                <TextInput
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  icon={Timer}
                  min="15"
                  step="15"
                  defaultValue="60"
                />
              </FieldGroup>
            </div>

            <FieldGroup label="Est. Price (£)" htmlFor="estPrice">
              <TextInput
                id="estPrice"
                name="estPrice"
                type="number"
                icon={PoundSterling}
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estPrice}
                onChange={(e) => setEstPrice(e.target.value)}
              />
            </FieldGroup>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Priority" htmlFor="priority">
                <Select id="priority" name="priority" icon={Flag} defaultValue="medium">
                  {JOB_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {JOB_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="Technician" htmlFor="employeeId">
                <Select id="employeeId" name="employeeId" icon={Wrench} defaultValue="">
                  <option value="">Unassigned</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup label="Bay" htmlFor="bay">
              <TextInput id="bay" name="bay" icon={DoorOpen} placeholder="e.g. Bay 2" />
            </FieldGroup>

            <FieldSection title="Where will this job take place?">
              <div className="flex gap-2">
                {(
                  [
                    { value: "garage", label: "At the garage" },
                    { value: "customer_address", label: "Off-site" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocationType(opt.value)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      locationType === opt.value
                        ? "border-accent-600 bg-accent-50 text-accent-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {locationType !== "garage" ? <AddressAutocomplete value={location} onChange={setLocation} /> : null}
            </FieldSection>

            <FieldGroup label="Notes" htmlFor="notes">
              <div className="relative">
                <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <TextArea id="notes" name="notes" rows={3} className="pl-9" placeholder="Any additional details..." />
              </div>
            </FieldGroup>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={skipBooking}
                className="mr-auto text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {submitting ? "Booking..." : "Book Job & Continue"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "items" ? (
          <form className="space-y-6" onSubmit={handleItemsSubmit}>
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Labour lines</label>
                <button
                  type="button"
                  onClick={() => setLabourLines((lines) => [...lines, newLabourLine()])}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
                >
                  <Plus size={14} /> Add labour
                </button>
              </div>
              <div className="space-y-2.5">
                {labourLines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <TextInput
                        aria-label="Description"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLabourLine(line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <TextInput
                        aria-label="Hours"
                        type="number"
                        icon={Clock}
                        min="0"
                        step="0.25"
                        value={line.hours}
                        onChange={(e) => updateLabourLine(line.id, { hours: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <TextInput
                        aria-label="Rate per hour"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate/hr"
                        value={line.rate}
                        onChange={(e) => updateLabourLine(line.id, { rate: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLabourLine(line.id)}
                        disabled={labourLines.length === 1}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Parts used</label>
                <button
                  type="button"
                  onClick={() => setPartLines((lines) => [...lines, newPartLine()])}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
                >
                  <Plus size={14} /> Add part
                </button>
              </div>
              <div className="space-y-2.5">
                {partLines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Select aria-label="Part" value={line.partId ?? ""} onChange={(e) => selectPart(line.id, e.target.value)}>
                        <option value="">Custom / not in inventory</option>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <TextInput
                        aria-label="Description"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updatePartLine(line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <TextInput
                        aria-label="Quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updatePartLine(line.id, { quantity: Number(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <TextInput
                        aria-label="Unit price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit price"
                        value={line.unitPrice}
                        onChange={(e) => updatePartLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removePartLine(line.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {partLines.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    No parts allocated yet. Click &ldquo;Add part&rdquo; to add one.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Labour total</span>
                <span>{formatCurrency(labourLines.reduce((sum, l) => sum + l.hours * l.rate, 0))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Parts total</span>
                <span>{formatCurrency(partLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))}</span>
              </div>
            </div>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={skipItems}
                className="mr-auto text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Items & Continue"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "invoice" ? (
          <form className="space-y-5" onSubmit={handleInvoiceSubmit}>
            <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-800">
              {jobId
                ? "Pre-filled from the job's items — edit anything below before creating the invoice. It stays editable after creation too."
                : "No job linked — add line items manually. The invoice stays editable after creation."}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Invoice Date" htmlFor="invoiceDate" required>
                <TextInput id="invoiceDate" name="invoiceDate" type="date" icon={Calendar} required />
              </FieldGroup>
              <FieldGroup label="Due Date" htmlFor="dueDate" required>
                <TextInput id="dueDate" name="dueDate" type="date" icon={Calendar} required />
              </FieldGroup>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Line Items</label>
                <button
                  type="button"
                  onClick={addInvoiceLine}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>
              <div className="space-y-2.5">
                {invoiceLines.map((li) => (
                  <div
                    key={li.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <TextInput
                        aria-label="Description"
                        placeholder="Description"
                        value={li.description}
                        onChange={(e) => updateInvoiceLine(li.id, { description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <TextInput
                        aria-label="Quantity"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={li.quantity}
                        onChange={(e) => updateInvoiceLine(li.id, { quantity: Number(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <TextInput
                        aria-label="Unit price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit price"
                        value={li.unitPrice}
                        onChange={(e) => updateInvoiceLine(li.id, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeInvoiceLine(li.id)}
                        disabled={invoiceLines.length === 1}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="VAT Rate (%)" htmlFor="vatRate">
                <TextInput
                  id="vatRate"
                  name="vatRate"
                  type="number"
                  icon={Percent}
                  min="0"
                  max="100"
                  step="1"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                />
              </FieldGroup>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <FieldGroup label="Notes" htmlFor="notes">
              <div className="relative">
                <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <TextArea id="notes" name="notes" rows={3} className="pl-9" placeholder="Payment terms, thank you note, etc." />
              </div>
            </FieldGroup>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={skipInvoice}
                className="mr-auto text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  );
}

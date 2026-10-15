"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarClock,
  Clock,
  ClipboardList,
  DoorOpen,
  FileText,
  Flag,
  ListChecks,
  PoundSterling,
  Percent,
  Plus,
  Receipt,
  Timer,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, FieldSection, Select, TextArea, TextInput } from "@/components/ui/Field";
import { ServiceSpecificFields } from "@/components/forms/ServiceSpecificFields";
import { AddressAutocomplete, EMPTY_ADDRESS, type AddressValue } from "@/components/forms/AddressAutocomplete";
import { addBooking, addInvoice, updateJobLines } from "@/lib/supabase/mutations";
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
import type { BookingLocationType, Customer, Employee, JobPriority, JobType, Part } from "@/lib/types";
import { cn } from "@/lib/cn";

type WizardStep = "booking" | "items" | "invoice";

const STEPS: { key: WizardStep; label: string }[] = [
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
  return { id: `bl_${seq}`, description: "", hours: 1, rate: 0 };
}
function newPartLine(): DraftPartLine {
  seq += 1;
  return { id: `bp_${seq}`, partId: null, description: "", quantity: 1, unitPrice: 0 };
}
function newInvoiceLine(description = "", quantity = 1, unitPrice = 0): DraftInvoiceLine {
  seq += 1;
  return { id: `bi_${seq}`, description, quantity, unitPrice };
}

export function BookJobButton({
  customers,
  employees,
  parts = [],
  defaultVatRate = 20,
  triggerClassName,
  children,
}: {
  customers: Customer[];
  employees: Employee[];
  parts?: Part[];
  defaultVatRate?: number;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("booking");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeEmployees = employees.filter((e) => e.active);
  const partById = new Map(parts.map((p) => [p.id, p]));

  // Carried across steps once created.
  const [customerId, setCustomerId] = useState("");
  const [jobId, setJobId] = useState("");

  // Step: booking
  const [jobType, setJobType] = useState<JobType | "">("");
  const [estPrice, setEstPrice] = useState("");
  const [serviceValues, setServiceValues] = useState<ServiceFieldValues>({});
  const [storageValues, setStorageValues] = useState<StorageFormValues>(EMPTY_STORAGE_VALUES);
  const [locationType, setLocationType] = useState<BookingLocationType>("garage");
  const [location, setLocation] = useState<AddressValue>(EMPTY_ADDRESS);

  // Step: items
  const [labourLines, setLabourLines] = useState<DraftLabourLine[]>([newLabourLine()]);
  const [partLines, setPartLines] = useState<DraftPartLine[]>([]);

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
    setStep("booking");
    setCustomerId("");
    setJobId("");
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

    // The price field may hold a total this component computed for the
    // previous service (vehicle storage) — that value belongs to the
    // service being left, so don't carry it into an unrelated job type.
    if (wasStorage && nextType !== "vehicle_storage") {
      setEstPrice("");
    }
  }

  function handleServiceValueChange(name: string, value: string | number) {
    setServiceValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleStorageChange(patch: Partial<StorageFormValues>) {
    setStorageValues((prev) => {
      const next = { ...prev, ...patch };
      const total = storageTotal(next);
      setEstPrice(total !== null ? total.toFixed(2) : "");
      return next;
    });
  }

  // ---- Step 1: booking ----
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
    const selectedCustomerId = String(formData.get("customer") ?? "");
    const employeeId = String(formData.get("employeeId") ?? "");
    const employee = activeEmployees.find((emp) => emp.id === employeeId);
    const result = await addBooking({
      customerId: selectedCustomerId,
      jobType: jobType as JobType,
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      durationMinutes: formData.get("durationMinutes")
        ? Number(formData.get("durationMinutes"))
        : undefined,
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

    setCustomerId(selectedCustomerId);
    setJobId(result.jobId);
    // Seed the estimate price as a first invoice line so it isn't lost if
    // no items are added in the next step.
    if (estPrice && Number(estPrice) > 0) {
      setInvoiceLines([newInvoiceLine(JOB_TYPE_LABELS[jobType as JobType] ?? "Estimated work", 1, Number(estPrice))]);
    }
    setStep("items");
  }

  function skipItems() {
    setStep("invoice");
  }

  // ---- Step 2: job items (labour/parts) ----
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

  function skipInvoice() {
    handleClose();
  }

  // ---- Step 3: invoice ----
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
      vehicleId: "",
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
            <Plus size={15} /> New booking
          </>
        )}
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={STEPS[currentIndex]?.label ?? "Book a Job"}
        subtitle={
          step === "booking"
            ? "Schedule a new booking"
            : step === "items"
              ? "Add labour and parts to the job"
              : "Review and create the invoice"
        }
        icon={step === "booking" ? CalendarClock : step === "items" ? ListChecks : Receipt}
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

        {step === "booking" ? (
          <form className="space-y-5" onSubmit={handleBookingSubmit}>
            <FieldGroup label="Customer" htmlFor="customer" required>
              <Select id="customer" name="customer" icon={User} required defaultValue="">
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>

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
                onChange={handleServiceValueChange}
                storageValues={storageValues}
                onStorageChange={handleStorageChange}
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
              {locationType !== "garage" ? (
                <AddressAutocomplete value={location} onChange={setLocation} />
              ) : null}
            </FieldSection>

            <FieldGroup label="Notes" htmlFor="notes">
              <div className="relative">
                <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <TextArea
                  id="notes"
                  name="notes"
                  rows={4}
                  className="pl-9"
                  placeholder="Any additional details about the job..."
                />
              </div>
            </FieldGroup>

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

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

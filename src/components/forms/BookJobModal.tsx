"use client";
import { usePermission } from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileText,
  Flag,
  PoundSterling,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { ServiceSpecificFields } from "@/components/forms/ServiceSpecificFields";
import { addBooking } from "@/lib/supabase/mutations";
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
import type {
  Customer,
  Employee,
  Vehicle,
  JobPriority,
  JobType,
} from "@/lib/types";

export function BookJobButton({
  customers,
  employees,
  vehicles,
  initialDate,
}: {
  customers: Customer[];
  employees: Employee[];
  vehicles: Vehicle[];
  initialDate?: string;
}) {
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeEmployees = employees.filter((e) => e.active);

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);
  const [jobType, setJobType] = useState<JobType | "">("");
  const [estPrice, setEstPrice] = useState("");
  const [serviceValues, setServiceValues] = useState<ServiceFieldValues>({});
  const [storageValues, setStorageValues] =
    useState<StorageFormValues>(EMPTY_STORAGE_VALUES);

  const storageError =
    jobType === "vehicle_storage" &&
    storageValues.startDate &&
    storageValues.neededBy &&
    storageValues.neededBy < storageValues.startDate
      ? "Needed By date cannot be earlier than Start Date."
      : null;

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

  function resetForm() {
    setCustomerId("");
    setVehicleId("");
    setJobType("");
    setEstPrice("");
    setServiceValues({});
    setStorageValues(EMPTY_STORAGE_VALUES);
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (jobType === "vehicle_storage" && storageError) {
      setError(storageError);
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const serviceDetails = buildServiceDetails(
      jobType,
      serviceValues,
      storageValues,
    );
    const bookingDate = String(formData.get("date") ?? "");
    const result = await addBooking({
      customerId,
      vehicleId,
      time: String(formData.get("time") ?? ""),
      durationMinutes: Number(formData.get("duration") ?? 60),
      jobType: jobType as JobType,
      date: bookingDate,
      estPrice: estPrice ? Number(estPrice) : undefined,
      priority: String(formData.get("priority") ?? "medium") as JobPriority,
      technician: String(formData.get("technician") ?? ""),
      bay: String(formData.get("bay") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      serviceDetails,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    resetForm();
    if (bookingDate === initialDate) router.refresh();
    else router.push(`/diary?date=${encodeURIComponent(bookingDate)}`);
  }

  if (!can("bookings.manage")) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New booking
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Book a Job"
        subtitle="Schedule a new booking"
        icon={CalendarClock}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Customer" htmlFor="customer" required>
            <Select
              id="customer"
              name="customer"
              icon={User}
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setVehicleId("");
              }}
            >
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

          <FieldGroup label="Vehicle" htmlFor="booking-vehicle" required>
            <Select
              id="booking-vehicle"
              name="vehicle"
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">
                {customerId
                  ? "Select this customer&apos;s vehicle"
                  : "Select a customer first"}
              </option>
              {customerVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration} —{" "}
                  {[v.make, v.model].filter(Boolean).join(" ")}
                </option>
              ))}
            </Select>
            {customerId && customerVehicles.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700">
                Add a vehicle from this customer&apos;s details page first.
              </p>
            ) : null}
          </FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup
              label="Start time (garage local time)"
              htmlFor="booking-time"
              required
            >
              <TextInput id="booking-time" name="time" type="time" required />
            </FieldGroup>
            <FieldGroup
              label="Duration (minutes)"
              htmlFor="booking-duration"
              required
            >
              <TextInput
                id="booking-duration"
                name="duration"
                type="number"
                min={1}
                max={1440}
                step={1}
                defaultValue={60}
                required
              />
            </FieldGroup>
          </div>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Date" htmlFor="date" required>
              <TextInput
                id="date"
                name="date"
                type="date"
                defaultValue={initialDate}
                icon={CalendarClock}
                required
              />
            </FieldGroup>

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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Priority" htmlFor="priority">
              <Select
                id="priority"
                name="priority"
                icon={Flag}
                defaultValue="medium"
              >
                {JOB_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {JOB_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup label="Technician" htmlFor="technician">
              <Select
                id="technician"
                name="technician"
                icon={Wrench}
                defaultValue=""
              >
                <option value="">Unassigned</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.fullName}>
                    {e.fullName}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup label="Bay" htmlFor="bay">
            <TextInput
              id="bay"
              name="bay"
              icon={DoorOpen}
              placeholder="e.g. Bay 2"
            />
          </FieldGroup>

          <FieldGroup label="Notes" htmlFor="notes">
            <div className="relative">
              <FileText
                size={16}
                className="pointer-events-none absolute left-3 top-3 text-slate-400"
              />
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
              {submitting ? "Booking..." : "Book Job"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

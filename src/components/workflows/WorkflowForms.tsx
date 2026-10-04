"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput, Select } from "@/components/ui/Field";
import {
  addExpense,
  createJobInvoice,
  recordPayment,
  assignJobVehicle,
  saveReminderSettings,
  sendDueReminders,
  type MutationResult,
} from "@/lib/supabase/mutations";
import { usePermission } from "@/components/layout/PermissionContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { invoiceTotals, invoicePaymentTotals } from "@/lib/totals";
import type { Invoice, Vehicle } from "@/lib/types";

const buttonClass =
  "rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60";
function FormModal({
  title,
  children,
  submit,
}: {
  title: string;
  children: React.ReactNode;
  submit: (form: FormData) => Promise<MutationResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const r = await submit(new FormData(event.currentTarget));
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {title}
      </button>
      <Modal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title={title}
      >
        <form className="space-y-4" onSubmit={save}>
          <fieldset disabled={pending} className="space-y-4">
            {children}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button className={buttonClass} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function PaymentPanel({
  invoice,
  compact = false,
}: {
  invoice: Invoice;
  compact?: boolean;
}) {
  const can = usePermission();
  const { received, balance, legacyPaid } = invoicePaymentTotals(invoice);
  return (
    <section
      className={
        compact
          ? "border-t border-slate-100 pt-5"
          : "rounded-xl border border-slate-200 bg-white p-5"
      }
    >
      <div
        className={
          compact
            ? "space-y-5"
            : "flex flex-wrap items-center justify-between gap-4"
        }
      >
        <div>
          <h2 className="font-semibold">Payments</h2>
          {compact ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Total amount</dt>
                <dd className="font-semibold">
                  {formatCurrency(invoiceTotals(invoice).total)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Received</dt>
                <dd>{formatCurrency(received)}</dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-accent-50 p-3">
                <dt className="font-semibold text-accent-700">Remaining</dt>
                <dd className="font-bold text-accent-700">
                  {formatCurrency(balance)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Received: {formatCurrency(received)} · Remaining:{" "}
              {formatCurrency(balance)}
            </p>
          )}
        </div>
        {can("invoices.manage") &&
        balance > 0 &&
        invoice.status !== "estimate" ? (
          <FormModal
            title="Record Payment"
            submit={(form) => recordPayment(invoice.id, form)}
          >
            <FieldGroup label="Amount (£)" htmlFor="payment-amount" required>
              <TextInput
                id="payment-amount"
                name="amount"
                type="number"
                min="0.01"
                max={balance}
                step="0.01"
                required
                defaultValue={balance}
              />
            </FieldGroup>
            <FieldGroup label="Payment date" htmlFor="payment-date" required>
              <TextInput
                id="payment-date"
                name="paidOn"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </FieldGroup>
            <FieldGroup label="Method" htmlFor="payment-method">
              <Select id="payment-method" name="method">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Reference" htmlFor="payment-reference">
              <TextInput id="payment-reference" name="reference" />
            </FieldGroup>
          </FormModal>
        ) : null}
      </div>
      {legacyPaid ? (
        <p className="mt-3 text-xs text-slate-500">
          Marked paid before payment tracking was added. Payment date and method
          are unknown.
        </p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {invoice.payments.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 text-sm"
          >
            <span>
              {formatDate(p.paidOn)} · {p.method.replaceAll("_", " ")}
              {p.reference ? ` · ${p.reference}` : ""}
            </span>
            <span>{formatCurrency(p.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function JobInvoiceButton({ jobId }: { jobId: string }) {
  const router = useRouter(),
    can = usePermission();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  if (!can("invoices.manage")) return null;
  return (
    <div>
      <button
        className={buttonClass}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const r = await createJobInvoice(jobId);
            if (r.error) setError(r.error);
            else if (r.id) router.push(`/invoices/${r.id}`);
          } catch {
            setError("Could not create invoice.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Creating..." : "Create Invoice"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function JobVehiclePicker({
  jobId,
  vehicles,
}: {
  jobId: string;
  vehicles: Vehicle[];
}) {
  const can = usePermission();
  if (!can("jobs.manage", "jobs.update")) return null;
  return (
    <FormModal
      title="Assign Vehicle"
      submit={(f) => assignJobVehicle(jobId, String(f.get("vehicle")))}
    >
      <FieldGroup label="Customer vehicle" htmlFor="job-vehicle">
        <Select id="job-vehicle" name="vehicle" required defaultValue="">
          <option value="" disabled>
            Select a vehicle
          </option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registration}
            </option>
          ))}
        </Select>
      </FieldGroup>
    </FormModal>
  );
}
export function ExpenseButton() {
  const can = usePermission();
  if (!can("accounting.manage")) return null;
  return (
    <FormModal title="Add Expense" submit={addExpense}>
      <FieldGroup label="Description" htmlFor="expense-description" required>
        <TextInput id="expense-description" name="description" required />
      </FieldGroup>
      <FieldGroup
        label="Amount excluding recoverable VAT (£)"
        htmlFor="expense-amount"
        required
      >
        <TextInput
          id="expense-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
        />
      </FieldGroup>
      <FieldGroup label="Date" htmlFor="expense-date" required>
        <TextInput
          id="expense-date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </FieldGroup>
      <FieldGroup label="Category" htmlFor="expense-category">
        <Select id="expense-category" name="category">
          {["rent", "wages", "utilities", "insurance", "other"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FieldGroup>
      <p className="text-xs text-slate-500">
        Parts used on jobs are already counted. Do not enter them again here.
      </p>
    </FormModal>
  );
}
export function ReminderSettings({
  enabled,
  days,
  months,
}: {
  enabled: boolean;
  days: number;
  months: number;
}) {
  const can = usePermission(),
    router = useRouter();
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Automatic email reminders</h2>
      <p className="my-3 text-sm text-slate-500">
        MOT and service reminders are queued daily. Delivery checks run every 15
        minutes. Only customers who allow email are included.
      </p>
      {can("settings.manage") ? (
        <FormModal title="Reminder Settings" submit={saveReminderSettings}>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="enabled" defaultChecked={enabled} />
            Enable automatic MOT and service reminders
          </label>
          <FieldGroup label="Days before due date" htmlFor="reminder-days">
            <TextInput
              id="reminder-days"
              name="days"
              type="number"
              min={0}
              max={90}
              defaultValue={days}
            />
          </FieldGroup>
          <FieldGroup
            label="Service interval (months)"
            htmlFor="reminder-months"
          >
            <TextInput
              id="reminder-months"
              name="months"
              type="number"
              min={1}
              max={60}
              defaultValue={months}
            />
          </FieldGroup>
        </FormModal>
      ) : null}
      <p className="my-3 text-sm">
        Automatic reminders: {enabled ? "Enabled" : "Off"} · {days} days before
        · Service every {months} months
      </p>
      <button
        className={buttonClass}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const r = await sendDueReminders();
            setMessage(r.error ?? r.message ?? "Done");
            router.refresh();
          } catch {
            setMessage("Could not run reminders.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Checking..." : "Send Due Reminders"}
      </button>
      {message ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </section>
  );
}

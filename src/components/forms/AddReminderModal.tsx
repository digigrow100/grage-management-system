"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, Calendar, FileText, MessageSquare, Plus, Tag, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, Select, TextArea, TextInput } from "@/components/ui/Field";
import { addReminder } from "@/lib/supabase/mutations";
import type { Customer } from "@/lib/types";

export function AddReminderButton({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addReminder({
      title: String(formData.get("title") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      customerId: String(formData.get("customer") ?? "") || undefined,
      notes: String(formData.get("notes") ?? ""),
      reminderType: formData.get("reminderType") as
        | "mot"
        | "service"
        | "booking"
        | "general",
      channel: formData.get("channel") as "in_app" | "email" | "sms",
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={15} /> New reminder
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Reminder"
        subtitle="Set a follow-up for yourself or the team"
        icon={BellPlus}
        maxWidth="max-w-lg"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldGroup label="Title" htmlFor="title" required>
            <TextInput
              id="title"
              name="title"
              icon={BellPlus}
              required
              placeholder="Call customer about MOT renewal"
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Due Date" htmlFor="dueDate" required>
              <TextInput id="dueDate" name="dueDate" type="date" icon={Calendar} required />
            </FieldGroup>

            <FieldGroup label="Customer" htmlFor="customer">
              <Select id="customer" name="customer" icon={User} defaultValue="">
                <option value="">No customer linked</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Type" htmlFor="reminderType">
              <Select id="reminderType" name="reminderType" icon={Tag} defaultValue="general">
                <option value="mot">MOT</option>
                <option value="service">Service</option>
                <option value="booking">Booking</option>
                <option value="general">General</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Channel" htmlFor="channel">
              <Select id="channel" name="channel" icon={MessageSquare} defaultValue="in_app">
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </Select>
            </FieldGroup>
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <div className="relative">
              <FileText size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <TextArea id="notes" name="notes" rows={3} className="pl-9" placeholder="Any extra context..." />
            </div>
          </FieldGroup>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add Reminder"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

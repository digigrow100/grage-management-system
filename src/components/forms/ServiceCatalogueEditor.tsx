"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { deleteService, upsertService } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { ServiceCatalogueItem } from "@/lib/types";

function AddServiceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await upsertService({
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      defaultDurationMinutes: Number(formData.get("defaultDurationMinutes") ?? 60),
      defaultLabourPrice: formData.get("defaultLabourPrice")
        ? Number(formData.get("defaultLabourPrice"))
        : undefined,
      active: true,
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
        className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
      >
        <Plus size={13} /> Add service
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Service" maxWidth="max-w-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FieldGroup label="Name" htmlFor="name" required>
            <TextInput id="name" name="name" required placeholder="e.g. Brake Inspection" />
          </FieldGroup>
          <FieldGroup label="Category" htmlFor="category" hint="Optional">
            <TextInput id="category" name="category" placeholder="e.g. Servicing" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Duration (mins)" htmlFor="defaultDurationMinutes">
              <TextInput id="defaultDurationMinutes" name="defaultDurationMinutes" type="number" min="1" defaultValue="60" />
            </FieldGroup>
            <FieldGroup label="Labour price (£)" htmlFor="defaultLabourPrice" hint="Optional">
              <TextInput id="defaultLabourPrice" name="defaultLabourPrice" type="number" min="0" step="0.01" />
            </FieldGroup>
          </div>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-3">
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
              {submitting ? "Adding..." : "Add Service"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ServiceCatalogueEditor({ services }: { services: ServiceCatalogueItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggleActive(service: ServiceCatalogueItem) {
    setPendingId(service.id);
    await upsertService(
      {
        name: service.name,
        description: service.description ?? undefined,
        category: service.category ?? undefined,
        defaultDurationMinutes: service.defaultDurationMinutes,
        defaultLabourPrice: service.defaultLabourPrice ?? undefined,
        vatRate: service.vatRate ?? undefined,
        active: !service.active,
      },
      service.id
    );
    setPendingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    await deleteService(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Service catalogue"
        subtitle="Used by bookings, estimates and jobs"
        action={<AddServiceButton />}
      />
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Category</th>
                <th className="px-5 py-2 font-medium">Duration</th>
                <th className="px-5 py-2 font-medium">Labour price</th>
                <th className="px-5 py-2 font-medium">Active</th>
                <th className="px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-5 py-3 text-slate-500">{s.category ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{s.defaultDurationMinutes} min</td>
                  <td className="px-5 py-3 text-slate-500">
                    {s.defaultLabourPrice != null ? formatCurrency(s.defaultLabourPrice) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      disabled={pendingId === s.id}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={pendingId === s.id}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-400">
                    No services yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { addClosure, deleteClosure } from "@/lib/supabase/mutations";
import { formatDate } from "@/lib/format";
import type { GarageClosure } from "@/lib/types";

export function ClosuresManager({ closures }: { closures: GarageClosure[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");
    const title = String(formData.get("title") ?? "");

    const result = await addClosure({
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      title,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteClosure(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Closures" subtitle="Bank holidays and one-off closures — bookings can't be made during these" />
      <CardBody className="space-y-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={handleAdd}>
          <FieldGroup label="Starts" htmlFor="startsAt">
            <TextInput id="startsAt" name="startsAt" type="datetime-local" required />
          </FieldGroup>
          <FieldGroup label="Ends" htmlFor="endsAt">
            <TextInput id="endsAt" name="endsAt" type="datetime-local" required />
          </FieldGroup>
          <FieldGroup label="Title" htmlFor="title" hint="Optional">
            <TextInput id="title" name="title" placeholder="e.g. Christmas Day" />
          </FieldGroup>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60 sm:w-auto"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </form>

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="space-y-2">
          {closures.length === 0 ? (
            <p className="text-sm text-slate-400">No closures configured.</p>
          ) : (
            closures.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.title || "Closure"}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(c.startsAt.slice(0, 10))} – {formatDate(c.endsAt.slice(0, 10))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}

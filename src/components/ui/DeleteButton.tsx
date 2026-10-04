"use client";

import { useState } from "react";
import { usePermission } from "@/components/layout/PermissionContext";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { MutationResult } from "@/lib/supabase/mutations";

export function DeleteButton<T>({
  id,
  action,
  confirmMessage,
  label,
  redirectTo,
  allowed = true,
}: {
  id: T;
  action: (id: T) => Promise<MutationResult>;
  confirmMessage: string;
  label?: string;
  redirectTo?: string;
  allowed?: boolean;
}) {
  const can = usePermission(),
    pathname = usePathname();
  const resource = (
    {
      customers: "customers",
      jobs: "jobs",
      invoices: "invoices",
      inventory: "inventory",
      employees: "employees",
      reminders: "reminders",
    } as Record<string, string>
  )[pathname.split("/")[1]];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await action(id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (!allowed || (resource && !can(`${resource}.manage`))) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={label ?? "Delete"}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 size={14} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete Confirmation"
        icon={AlertTriangle}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{confirmMessage}</p>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-rose-600/30 transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              {pending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { cancelLeave, decideLeave } from "@/lib/supabase/mutations";
import type { LeaveStatus } from "@/lib/types";

export function LeaveRowActions({ id, status }: { id: string; status: LeaveStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecide(decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    const result = await decideLeave(id, decision);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCancel() {
    setBusy(true);
    setError(null);
    const result = await cancelLeave(id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (status !== "requested") {
    return status === "approved" || status === "rejected" ? (
      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        className="text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-60"
      >
        Cancel
      </button>
    ) : null;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      <button
        type="button"
        onClick={() => handleDecide("approved")}
        disabled={busy}
        aria-label="Approve"
        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
      </button>
      <button
        type="button"
        onClick={() => handleDecide("rejected")}
        disabled={busy}
        aria-label="Reject"
        className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
      >
        <X size={12} /> Reject
      </button>
    </div>
  );
}

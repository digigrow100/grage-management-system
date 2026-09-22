"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updatePurchaseOrderStatus } from "@/lib/supabase/mutations";
import type { PurchaseOrderStatus } from "@/lib/types";

const SETTABLE_STATUSES: Exclude<PurchaseOrderStatus, "partially_received" | "received">[] = [
  "draft",
  "ordered",
  "cancelled",
];

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

export function PurchaseOrderStatusSelect({
  purchaseOrderId,
  status,
}: {
  purchaseOrderId: string;
  status: PurchaseOrderStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "partially_received" || status === "received") {
    return <span className="text-sm font-medium text-slate-700">{STATUS_LABELS[status]}</span>;
  }

  async function handleChange(next: PurchaseOrderStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);

    const result = await updatePurchaseOrderStatus(purchaseOrderId, next);

    setSaving(false);
    if (result.error) {
      setCurrent(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="relative inline-block">
        <select
          value={current}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as PurchaseOrderStatus)}
          className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-60"
        >
          {SETTABLE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {saving ? (
          <Loader2 size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

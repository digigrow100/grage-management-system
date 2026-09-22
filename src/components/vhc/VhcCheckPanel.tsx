"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { VhcItemRow } from "@/components/vhc/VhcItemRow";
import { addVhcItem, completeVhcCheck } from "@/lib/supabase/mutations";
import { formatDate } from "@/lib/format";
import type { VhcCheck } from "@/lib/types";

export function VhcCheckPanel({
  check,
  jobId,
  garageId,
}: {
  check: VhcCheck;
  jobId: string;
  garageId: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("General");
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const readOnly = check.status !== "in_progress";

  const counts = check.items.reduce(
    (acc, item) => {
      acc[item.result] = (acc[item.result] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    await addVhcItem(check.id, jobId, { category, label });
    setAdding(false);
    setLabel("");
    router.refresh();
  }

  async function handleComplete() {
    setCompleting(true);
    await completeVhcCheck(check.id, jobId);
    setCompleting(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Started {formatDate(check.startedAt)}
          {check.completedAt ? ` · Completed ${formatDate(check.completedAt)}` : ""}
        </span>
        <span className="flex gap-2">
          <span className="text-emerald-600">{counts.green ?? 0} OK</span>
          <span className="text-amber-600">{counts.amber ?? 0} advise</span>
          <span className="text-rose-600">{counts.red ?? 0} urgent</span>
        </span>
      </div>

      <div className="space-y-2">
        {check.items.map((item) => (
          <VhcItemRow key={item.id} item={item} jobId={jobId} garageId={garageId} readOnly={readOnly} />
        ))}
        {check.items.length === 0 ? (
          <p className="text-sm text-slate-400">No checklist items yet.</p>
        ) : null}
      </div>

      {!readOnly ? (
        <>
          <form onSubmit={handleAddItem} className="flex flex-wrap gap-2 rounded-lg border border-dashed border-slate-200 p-3">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/10"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Checklist item"
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/10"
            />
            <button
              type="submit"
              disabled={adding || !label.trim()}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900 disabled:opacity-60"
            >
              <Plus size={13} /> Add
            </button>
          </form>

          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 size={14} /> {completing ? "Completing..." : "Complete check"}
          </button>
        </>
      ) : null}
    </div>
  );
}

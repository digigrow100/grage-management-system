"use client";
import { usePermission } from "@/components/layout/PermissionContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ListChecks, Plus, Trash2, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Select, TextInput } from "@/components/ui/Field";
import { updateJobLines } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import type { JobCard, Part } from "@/lib/types";

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
  costPrice: number;
}

let lineSeq = 0;
function newLabourLine(): DraftLabourLine {
  lineSeq += 1;
  return { id: `dl_${lineSeq}`, description: "", hours: 1, rate: 0 };
}
function newPartLine(): DraftPartLine {
  lineSeq += 1;
  return {
    id: `dp_${lineSeq}`,
    partId: null,
    description: "",
    quantity: 1,
    unitPrice: 0,
    costPrice: 0,
  };
}

export function EditJobLinesButton({
  job,
  parts,
}: {
  job: JobCard;
  parts: Part[];
}) {
  const can = usePermission();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labourLines, setLabourLines] = useState<DraftLabourLine[]>(
    job.labourLines.length > 0
      ? job.labourLines.map((l) => ({
          id: l.id,
          description: l.description,
          hours: l.hours,
          rate: l.rate,
        }))
      : [newLabourLine()],
  );
  const [partLines, setPartLines] = useState<DraftPartLine[]>(
    job.partLines.map((l) => ({
      id: l.id,
      partId: l.partId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      costPrice: l.costPrice,
    })),
  );

  const partById = new Map(parts.map((p) => [p.id, p]));

  function updateLabourLine(id: string, patch: Partial<DraftLabourLine>) {
    setLabourLines((lines) =>
      lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  }
  function removeLabourLine(id: string) {
    setLabourLines((lines) =>
      lines.length > 1 ? lines.filter((l) => l.id !== id) : lines,
    );
  }

  function updatePartLine(id: string, patch: Partial<DraftPartLine>) {
    setPartLines((lines) =>
      lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
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
      costPrice: part ? part.costPrice : 0,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await updateJobLines(job.id, {
      labourLines: labourLines.map(({ description, hours, rate }) => ({
        description,
        hours,
        rate,
      })),
      partLines: partLines.map(
        ({ partId, description, quantity, unitPrice, costPrice }) => ({
          partId,
          description,
          quantity,
          unitPrice,
          costPrice,
        }),
      ),
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!can("jobs.manage", "jobs.update")) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <ListChecks size={13} /> Edit lines
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Job Lines"
        subtitle="Labour and parts used on this job"
        icon={Wrench}
        maxWidth="max-w-2xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Labour lines
              </label>
              <button
                type="button"
                onClick={() =>
                  setLabourLines((lines) => [...lines, newLabourLine()])
                }
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
                      onChange={(e) =>
                        updateLabourLine(line.id, {
                          description: e.target.value,
                        })
                      }
                      required
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
                      onChange={(e) =>
                        updateLabourLine(line.id, {
                          hours: Number(e.target.value) || 0,
                        })
                      }
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
                      onChange={(e) =>
                        updateLabourLine(line.id, {
                          rate: Number(e.target.value) || 0,
                        })
                      }
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
              <label className="text-sm font-medium text-slate-700">
                Parts used
              </label>
              <button
                type="button"
                onClick={() =>
                  setPartLines((lines) => [...lines, newPartLine()])
                }
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
                    <Select
                      aria-label="Part"
                      value={line.partId ?? ""}
                      onChange={(e) => selectPart(line.id, e.target.value)}
                    >
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
                      onChange={(e) =>
                        updatePartLine(line.id, { description: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <TextInput
                      aria-label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) =>
                        updatePartLine(line.id, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
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
                      onChange={(e) =>
                        updatePartLine(line.id, {
                          unitPrice: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-slate-500">
                      Unit cost (£)
                    </label>
                    <TextInput
                      aria-label="Unit cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.costPrice}
                      disabled={Boolean(line.partId)}
                      onChange={(e) =>
                        updatePartLine(line.id, {
                          costPrice: Number(e.target.value) || 0,
                        })
                      }
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
                  No parts allocated. Click &ldquo;Add part&rdquo; to add one.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Labour total</span>
              <span>
                {formatCurrency(
                  labourLines.reduce((sum, l) => sum + l.hours * l.rate, 0),
                )}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Parts total</span>
              <span>
                {formatCurrency(
                  partLines.reduce(
                    (sum, l) => sum + l.quantity * l.unitPrice,
                    0,
                  ),
                )}
              </span>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

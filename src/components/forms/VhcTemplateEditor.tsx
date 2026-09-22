"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { deleteVhcTemplate, saveVhcTemplate, type VhcTemplateItemDraftInput } from "@/lib/supabase/mutations";
import type { VhcTemplate } from "@/lib/types";

interface DraftItem extends VhcTemplateItemDraftInput {
  id: string;
}

let itemSeq = 0;
function newItem(sortOrder: number): DraftItem {
  itemSeq += 1;
  return { id: `draft_${itemSeq}`, category: "General", label: "", sortOrder };
}

function TemplateForm({
  template,
  onDone,
}: {
  template?: VhcTemplate;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [items, setItems] = useState<DraftItem[]>(
    template
      ? template.items.map((item) => ({ id: item.id, category: item.category, label: item.label, sortOrder: item.sortOrder }))
      : [newItem(0)]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addItemRow() {
    setItems((rows) => [...rows, newItem(rows.length)]);
  }

  function removeItemRow(id: string) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await saveVhcTemplate(
      {
        name,
        isDefault,
        items: items
          .filter((i) => i.label.trim())
          .map((i, idx) => ({ category: i.category || "General", label: i.label, sortOrder: idx })),
      },
      template?.id
    );

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FieldGroup label="Template Name" htmlFor="name" required>
        <TextInput
          id="name"
          name="name"
          icon={ClipboardList}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Standard VHC"
        />
      </FieldGroup>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-slate-300"
        />
        Default template
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Checklist items</p>
        {items.map((item) => (
          <div key={item.id} className="flex gap-2">
            <TextInput
              aria-label="Category"
              value={item.category}
              onChange={(e) => updateItem(item.id, { category: e.target.value })}
              placeholder="Category"
              className="w-28"
            />
            <TextInput
              aria-label="Item"
              value={item.label}
              onChange={(e) => updateItem(item.id, { label: e.target.value })}
              placeholder="Checklist item"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeItemRow(item.id)}
              className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove item"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItemRow}
          className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700"
        >
          <Plus size={14} /> Add item
        </button>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : template ? "Save Changes" : "Add Template"}
        </button>
      </div>
    </form>
  );
}

function TemplateButton({ template, label }: { template?: VhcTemplate; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          template
            ? "rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            : "flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700"
        }
      >
        {template ? label : (
          <>
            <Plus size={13} /> {label}
          </>
        )}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={template ? "Edit Template" : "New VHC Template"} icon={ClipboardList} maxWidth="max-w-lg">
        <TemplateForm template={template} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function VhcTemplateEditor({ templates }: { templates: VhcTemplate[] }) {
  return (
    <Card>
      <CardHeader
        title="VHC Templates"
        subtitle="Checklists used when starting a Vehicle Health Check"
        action={<TemplateButton label="New template" />}
      />
      <CardBody className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                {t.name} {t.isDefault ? <span className="ml-1 text-xs font-normal text-accent-600">(default)</span> : null}
              </p>
              <p className="text-xs text-slate-500">{t.items.length} items</p>
            </div>
            <div className="flex items-center gap-1">
              <TemplateButton template={t} label="Edit" />
              <DeleteButton
                id={t.id}
                action={deleteVhcTemplate}
                label={`Delete ${t.name}`}
                confirmMessage={`Delete "${t.name}"? This cannot be undone.`}
              />
            </div>
          </div>
        ))}
        {templates.length === 0 ? (
          <p className="text-sm text-slate-400">No VHC templates yet — checks can still be run with a blank checklist.</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

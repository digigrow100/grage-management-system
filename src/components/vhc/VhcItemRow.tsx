"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addVhcItemPhoto, updateVhcItem } from "@/lib/supabase/mutations";
import { cn } from "@/lib/cn";
import type { VhcItem, VhcItemResult } from "@/lib/types";

const RESULTS: { value: VhcItemResult; label: string; className: string }[] = [
  { value: "green", label: "OK", className: "bg-emerald-600 text-white" },
  { value: "amber", label: "Advise", className: "bg-amber-500 text-white" },
  { value: "red", label: "Urgent", className: "bg-rose-600 text-white" },
  { value: "not_applicable", label: "N/A", className: "bg-slate-400 text-white" },
];

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.storage.from("vhc-photos").createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-slate-100" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
  );
}

export function VhcItemRow({
  item,
  jobId,
  garageId,
  readOnly,
}: {
  item: VhcItem;
  jobId: string;
  garageId: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState(item.result);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResultChange(next: VhcItemResult) {
    if (readOnly) return;
    setResult(next);
    setSaving(true);
    const res = await updateVhcItem(item.id, jobId, { result: next });
    setSaving(false);
    if (res.error) setError(res.error);
    router.refresh();
  }

  async function handleNotesBlur() {
    if (readOnly || notes === (item.notes ?? "")) return;
    setSaving(true);
    const res = await updateVhcItem(item.id, jobId, { notes });
    setSaving(false);
    if (res.error) setError(res.error);
    router.refresh();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${garageId}/${item.vhcCheckId}/${item.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("vhc-photos").upload(path, file);

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const res = await addVhcItemPhoto(item.id, jobId, path);
    setUploading(false);
    if (res.error) setError(res.error);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">{item.category}</p>
          <p className="text-sm font-medium text-slate-900">{item.label}</p>
        </div>
        {saving ? <Loader2 size={14} className="mt-1 shrink-0 animate-spin text-slate-400" /> : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {RESULTS.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={readOnly}
            onClick={() => handleResultChange(r.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              result === r.value ? r.className : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!readOnly || notes ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          disabled={readOnly}
          rows={2}
          placeholder="Notes..."
          className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/10 disabled:bg-slate-50"
        />
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.photoPaths.map((path) => (
          <PhotoThumb key={path} path={path} />
        ))}
        {!readOnly ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-accent-400 hover:text-accent-600 disabled:opacity-60"
              aria-label="Add photo"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

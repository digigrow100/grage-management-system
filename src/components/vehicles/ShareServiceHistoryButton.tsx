"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { generateVehicleHistoryLink } from "@/lib/supabase/mutations";

export function ShareServiceHistoryButton({ vehicleId }: { vehicleId: string }) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await generateVehicleHistoryLink(vehicleId);
    setLoading(false);

    if (result.error || !result.token) {
      setError(result.error ?? "Could not create link");
      return;
    }

    const url = `${window.location.origin}/service-history/${result.token}`;
    setLink(url);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Share service history"
      title={link ? "Copy service history link" : "Generate service history link"}
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : copied ? (
        <Check size={14} className="text-emerald-600" />
      ) : link ? (
        <Copy size={14} />
      ) : (
        <Share2 size={14} />
      )}
      {error ? <span className="sr-only">{error}</span> : null}
    </button>
  );
}

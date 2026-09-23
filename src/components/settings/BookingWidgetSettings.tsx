"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { regenerateBookingWidgetToken, setBookingWidgetEnabled } from "@/lib/supabase/mutations";
import { cn } from "@/lib/cn";

export function BookingWidgetSettings({
  token,
  enabled,
}: {
  token: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = typeof window !== "undefined" ? `${window.location.origin}/book/${token}` : `/book/${token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleToggle() {
    setBusy(true);
    setError(null);
    const result = await setBookingWidgetEnabled(!enabled);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRegenerate() {
    if (!window.confirm("Regenerate the booking link? The old link will stop working immediately.")) return;
    setBusy(true);
    setError(null);
    const result = await regenerateBookingWidgetToken();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Online booking widget"
        subtitle="Share this link so customers can request a booking without logging in"
      />
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Accepting online requests</p>
            <p className="text-xs text-slate-500">
              Turn off to hide the form; the link stays the same.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            aria-pressed={enabled}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-accent-600" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Regenerate
          </button>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </CardBody>
    </Card>
  );
}

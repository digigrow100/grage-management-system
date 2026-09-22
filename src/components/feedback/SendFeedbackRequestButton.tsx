"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageSquareHeart } from "lucide-react";
import { sendFeedbackRequest } from "@/lib/supabase/mutations";

export function SendFeedbackRequestButton({
  jobId,
  customerId,
}: {
  jobId: string;
  customerId: string;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSend() {
    setSending(true);
    setError(null);
    const result = await sendFeedbackRequest(jobId, customerId);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLink(`${window.location.origin}/feedback/${result.token}`);
    router.refresh();
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (link) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
        <span className="max-w-[16rem] truncate text-slate-600">{link}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 font-medium text-white hover:bg-slate-900"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
      >
        <MessageSquareHeart size={13} /> {sending ? "Creating link..." : "Send feedback request"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}

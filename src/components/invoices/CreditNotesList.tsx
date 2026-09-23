"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { voidCreditNote } from "@/lib/supabase/mutations";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CreditNote, CreditNoteStatus } from "@/lib/types";

const STATUS_TONE: Record<CreditNoteStatus, "neutral" | "green" | "red"> = {
  draft: "neutral",
  issued: "green",
  void: "red",
};

function creditNoteTotal(cn: CreditNote) {
  const subtotal = cn.lineItems.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  return subtotal + subtotal * (cn.vatRate / 100);
}

function CreditNoteRow({ creditNote, invoiceId }: { creditNote: CreditNote; invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleVoid() {
    setBusy(true);
    await voidCreditNote(creditNote.id, invoiceId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
      <div>
        <p className="font-medium text-slate-900">
          {creditNote.number} · {formatCurrency(creditNoteTotal(creditNote))}
        </p>
        <p className="text-xs text-slate-500">
          {formatDate(creditNote.date)}
          {creditNote.reason ? ` · ${creditNote.reason}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[creditNote.status]}>{creditNote.status}</Badge>
        {creditNote.status === "issued" ? (
          <button
            type="button"
            onClick={handleVoid}
            disabled={busy}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Void
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CreditNotesList({
  creditNotes,
  invoiceId,
}: {
  creditNotes: CreditNote[];
  invoiceId: string;
}) {
  if (creditNotes.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Credit notes" subtitle={`${creditNotes.length} issued against this invoice`} />
      <CardBody className="space-y-2">
        {creditNotes.map((cn) => (
          <CreditNoteRow key={cn.id} creditNote={cn} invoiceId={invoiceId} />
        ))}
      </CardBody>
    </Card>
  );
}

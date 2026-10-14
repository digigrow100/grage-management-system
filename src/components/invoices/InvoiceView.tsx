"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Download, Loader2 } from "lucide-react";
import { InvoicePaper, A4_WIDTH_PX, A4_HEIGHT_PX } from "./InvoicePaper";
import { EditInvoiceButton } from "@/components/forms/EditInvoiceModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { CreateCreditNoteButton } from "@/components/invoices/CreateCreditNoteModal";
import { convertEstimateToInvoice, deleteInvoice, updateInvoiceStatus } from "@/lib/supabase/mutations";
import type { Customer, GarageSettings, Invoice, InvoiceStatus, Vehicle } from "@/lib/types";

// "paid" is deliberately excluded: the database only allows an invoice to
// become paid once its recorded payments cover the full total, which this
// app has no UI for yet — offering it here would just fail silently.
const QUICK_STATUS_OPTIONS: Exclude<InvoiceStatus, "estimate" | "paid">[] = ["draft", "sent"];

interface InvoiceViewProps {
  invoice: Invoice;
  customer?: Customer;
  vehicle?: Vehicle;
  totals: { subtotal: number; vat: number; total: number };
  customers: Customer[];
  vehicles: Vehicle[];
  garage?: GarageSettings;
}

export function InvoiceView({
  invoice,
  customer,
  vehicle,
  totals,
  customers,
  vehicles,
  garage,
}: InvoiceViewProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Exclude<InvoiceStatus, "estimate" | "paid">;
    if (next === invoice.status || updatingStatus) return;
    setUpdatingStatus(true);
    setStatusError(null);
    const result = await updateInvoiceStatus(invoice.id, next);
    setUpdatingStatus(false);
    if (result.error) {
      setStatusError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleConvert() {
    if (converting) return;
    setConverting(true);
    setConvertError(null);
    const result = await convertEstimateToInvoice(invoice.id);
    setConverting(false);
    if (result.error) {
      setConvertError(result.error);
      return;
    }
    router.refresh();
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      setScale(Math.min(1, width / A4_WIDTH_PX));
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleDownload() {
    if (!paperRef.current || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        210,
        297,
        undefined,
        "FAST"
      );
      pdf.save(`${invoice.number}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} /> Back to invoices
        </Link>
        <div className="flex items-center gap-2">
          <EditInvoiceButton invoice={invoice} customers={customers} vehicles={vehicles} />
          {invoice.status !== "estimate" && invoice.status !== "paid" ? (
            <select
              aria-label="Change invoice status"
              value={invoice.status}
              onChange={handleStatusChange}
              disabled={updatingStatus}
              className="capitalize rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              {QUICK_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
              {invoice.status === "overdue" ? (
                <option value="overdue" className="capitalize">
                  overdue
                </option>
              ) : null}
            </select>
          ) : null}
          <DeleteButton
            id={invoice.id}
            action={deleteInvoice}
            label={`Delete ${invoice.number}`}
            confirmMessage={`Delete invoice ${invoice.number}? This cannot be undone.`}
            redirectTo="/invoices"
          />
          {invoice.status === "estimate" ? (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60"
            >
              {converting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRightLeft size={15} />
              )}
              {converting ? "Converting..." : "Convert to Invoice"}
            </button>
          ) : null}
          {invoice.status !== "estimate" && invoice.status !== "draft" ? (
            <CreateCreditNoteButton invoice={invoice} />
          ) : null}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {convertError ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {convertError}
        </p>
      ) : null}

      {statusError ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {statusError}
        </p>
      ) : null}

      <div ref={containerRef} className="w-full">
        {scale === null ? (
          <div
            className="mx-auto animate-pulse rounded-lg bg-slate-100"
            style={{ maxWidth: A4_WIDTH_PX, aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }}
          />
        ) : (
          <div
            className="mx-auto overflow-hidden rounded-lg shadow-sm shadow-slate-950/10 ring-1 ring-slate-200"
            style={{ width: A4_WIDTH_PX * scale, height: A4_HEIGHT_PX * scale }}
          >
            <div style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <InvoicePaper invoice={invoice} customer={customer} vehicle={vehicle} totals={totals} garage={garage} />
            </div>
          </div>
        )}
      </div>

      {/* Full-size, untransformed copy used only for PDF capture — kept off-screen
          so the visible preview's CSS scaling never affects export quality/sizing. */}
      <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }} aria-hidden="true">
        <InvoicePaper ref={paperRef} invoice={invoice} customer={customer} vehicle={vehicle} totals={totals} garage={garage} />
      </div>
    </>
  );
}

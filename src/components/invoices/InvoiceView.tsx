"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { PaymentPanel } from "@/components/workflows/WorkflowForms";
import { usePermission } from "@/components/layout/PermissionContext";
import { InvoicePaper, A4_WIDTH_PX, A4_HEIGHT_PX } from "./InvoicePaper";
import { EditInvoiceButton } from "@/components/forms/EditInvoiceModal";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  convertEstimateToInvoice,
  deleteInvoice,
} from "@/lib/supabase/mutations";
import type { Customer, GarageSettings, Invoice, Vehicle } from "@/lib/types";

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
  const can = usePermission();
  const editable =
    can("invoices.manage") &&
    invoice.status !== "paid" &&
    invoice.payments.length === 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

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
        "FAST",
      );
      pdf.save(`${invoice.number}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700"
          >
            <ArrowLeft size={16} /> Back to invoices
          </Link>
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-500">Invoice number</p>
            <h1 className="mt-2 break-words text-2xl font-bold text-slate-900">
              {invoice.number}
            </h1>
            <Badge
              tone={
                invoice.status === "paid"
                  ? "green"
                  : invoice.status === "overdue"
                    ? "red"
                    : invoice.status === "estimate"
                      ? "purple"
                      : "neutral"
              }
              className="mt-3 capitalize"
            >
              {invoice.status}
            </Badge>
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Issued date</dt>
              <dd className="mt-1 font-medium">{formatDate(invoice.date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Due date</dt>
              <dd className="mt-1 font-medium">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
          </dl>
          <PaymentPanel invoice={invoice} compact />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
            {editable ? (
              <EditInvoiceButton
                invoice={invoice}
                customers={customers}
                vehicles={vehicles}
              />
            ) : null}
            {editable ? (
              <DeleteButton
                id={invoice.id}
                action={deleteInvoice}
                label={`Delete ${invoice.number}`}
                confirmMessage={`Delete invoice ${invoice.number}? This cannot be undone.`}
                redirectTo="/invoices"
              />
            ) : null}
            {invoice.status === "estimate" && can("invoices.manage") ? (
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
          </div>
          {convertError ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
            >
              {convertError}
            </p>
          ) : null}
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {invoice.status === "estimate"
                  ? "Estimate details"
                  : "Invoice details"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View and manage this{" "}
                {invoice.status === "estimate" ? "estimate" : "invoice"}.
              </p>
            </div>
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
          <div ref={containerRef} className="w-full">
            {scale === null ? (
              <div
                className="mx-auto animate-pulse rounded-lg bg-slate-100"
                style={{
                  maxWidth: A4_WIDTH_PX,
                  aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}`,
                }}
              />
            ) : (
              <div
                className="mx-auto overflow-hidden rounded-lg shadow-sm shadow-slate-950/10 ring-1 ring-slate-200"
                style={{
                  width: A4_WIDTH_PX * scale,
                  height: A4_HEIGHT_PX * scale,
                }}
              >
                <div
                  style={{
                    width: A4_WIDTH_PX,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <InvoicePaper
                    invoice={invoice}
                    customer={customer}
                    vehicle={vehicle}
                    totals={totals}
                    garage={garage}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Full-size, untransformed copy used only for PDF capture — kept off-screen
          so the visible preview's CSS scaling never affects export quality/sizing. */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: -9999,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <InvoicePaper
          ref={paperRef}
          invoice={invoice}
          customer={customer}
          vehicle={vehicle}
          totals={totals}
          garage={garage}
        />
      </div>
    </>
  );
}

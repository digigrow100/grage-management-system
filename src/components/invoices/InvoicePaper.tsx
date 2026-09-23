import { forwardRef } from "react";
import type { Customer, GarageSettings, Invoice, Vehicle } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const DEFAULT_GARAGE: GarageSettings = {
  id: "",
  garageName: "My Garage Ltd",
  addressLine: "14 Workshop Way",
  city: "Manchester",
  postCode: "M1 2AB",
  vatNumber: "GB123456789",
  defaultVatRate: 20,
  invoicePrefix: "INV",
  bookingWidgetToken: "",
  bookingWidgetEnabled: false,
};

// A4 at 96 DPI: 210mm x 297mm
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const statusStyles: Record<string, { bg: string; text: string }> = {
  estimate: { bg: "#f5f3ff", text: "#6d28d9" },
  draft: { bg: "#f1f5f9", text: "#334155" },
  sent: { bg: "#eef3ff", text: "#2856d8" },
  paid: { bg: "#ecfdf5", text: "#047857" },
  overdue: { bg: "#fff1f2", text: "#be123c" },
};

interface InvoicePaperProps {
  invoice: Invoice;
  customer?: Customer;
  vehicle?: Vehicle;
  totals: { subtotal: number; vat: number; total: number };
  garage?: GarageSettings;
}

export const InvoicePaper = forwardRef<HTMLDivElement, InvoicePaperProps>(
  function InvoicePaper({ invoice, customer, vehicle, totals, garage = DEFAULT_GARAGE }, ref) {
    const status = statusStyles[invoice.status] ?? statusStyles.draft;

    return (
      <div
        ref={ref}
        style={{
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          background: "#ffffff",
          color: "#0f172a",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 56,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: 24,
          }}
        >
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{garage.garageName}</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>
              {[garage.addressLine, garage.city, garage.postCode].filter(Boolean).join(", ")}
            </p>
            {garage.vatNumber ? (
              <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>
                VAT No. {garage.vatNumber}
              </p>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              {invoice.number}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "3px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                background: status.bg,
                color: status.text,
              }}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            fontSize: 13,
            marginTop: 24,
          }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", margin: 0, letterSpacing: 0.5 }}>
              Bill to
            </p>
            <p style={{ fontWeight: 600, margin: "6px 0 0" }}>{customer?.name}</p>
            <p style={{ color: "#64748b", margin: "2px 0 0" }}>
              {customer ? `${customer.address}, ${customer.city} ${customer.postCode}` : null}
            </p>
            <p style={{ color: "#64748b", margin: "2px 0 0" }}>{customer?.email}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", margin: 0, letterSpacing: 0.5 }}>
              Vehicle
            </p>
            <p style={{ fontWeight: 600, margin: "6px 0 0" }}>
              {vehicle?.registration ?? "—"}
            </p>
            <p style={{ color: "#64748b", margin: "2px 0 0" }}>
              {vehicle
                ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
                : null}
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", margin: "12px 0 0", letterSpacing: 0.5 }}>
              Dates
            </p>
            <p style={{ color: "#64748b", margin: "2px 0 0" }}>
              Issued {formatDate(invoice.date)} · Due {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 28 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "0 0 8px", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                Description
              </th>
              <th style={{ padding: "0 0 8px", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                Qty
              </th>
              <th style={{ padding: "0 0 8px", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                Unit price
              </th>
              <th style={{ padding: "0 0 8px", fontSize: 11, color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 0" }}>{li.description}</td>
                <td style={{ padding: "10px 0", color: "#64748b" }}>{li.quantity}</td>
                <td style={{ padding: "10px 0", color: "#64748b" }}>
                  {formatCurrency(li.unitPrice)}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                  {formatCurrency(li.quantity * li.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <div style={{ width: 260, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#64748b" }}>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#64748b" }}>VAT ({Math.round(invoice.vatRate)}%)</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #cbd5e1",
                marginTop: 4,
                paddingTop: 8,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              <span>{invoice.status === "estimate" ? "Estimated total" : "Total due"}</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes ? (
          <div style={{ marginTop: 24, fontSize: 12, color: "#64748b" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", margin: 0, letterSpacing: 0.5 }}>
              Notes
            </p>
            <p style={{ margin: "6px 0 0" }}>{invoice.notes}</p>
          </div>
        ) : null}

        <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          Thank you for your business — {garage.garageName}
        </div>
      </div>
    );
  }
);

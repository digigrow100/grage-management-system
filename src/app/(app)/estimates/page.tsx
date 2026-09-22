import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  getActiveCustomers,
  getCustomers,
  getEstimates,
  getGarageSettings,
  getVehicles,
} from "@/lib/supabase/queries";
import { deleteEstimate } from "@/lib/supabase/mutations";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreateEstimateButton } from "@/components/forms/CreateEstimateModal";
import { cn } from "@/lib/cn";
import type { EstimateStatus } from "@/lib/types";

const STATUS_TONE: Record<EstimateStatus, "neutral" | "blue" | "green" | "amber" | "red" | "purple"> = {
  draft: "neutral",
  sent: "blue",
  accepted: "green",
  declined: "red",
  expired: "amber",
  booked: "purple",
};

const FILTERS: { value: EstimateStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "booked", label: "Booked" },
];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = (status ?? "all") as EstimateStatus | "all";

  const [estimates, customers, activeCustomers, vehicles, garage] = await Promise.all([
    getEstimates(),
    getCustomers(),
    getActiveCustomers(),
    getVehicles(),
    getGarageSettings(),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const filtered =
    activeFilter === "all" ? estimates : estimates.filter((e) => e.status === activeFilter);

  return (
    <>
      <TopBar title="Estimates" subtitle={`${estimates.length} total`} />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <CreateEstimateButton
            customers={activeCustomers}
            vehicles={vehicles}
            defaultVatRate={garage.defaultVatRate}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/estimates" : `/estimates?status=${f.value}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === f.value
                  ? "bg-accent-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium">Valid Until</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((est) => {
                  const customer = est.customerId ? customerById.get(est.customerId) : undefined;
                  const vehicle = est.vehicleId ? vehicleById.get(est.vehicleId) : undefined;
                  return (
                    <tr key={est.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/estimates/${est.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {est.estimateNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{customer?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{vehicle?.registration ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(est.issueDate)}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {est.validUntil ? formatDate(est.validUntil) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[est.status]} className="capitalize">
                          {est.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(est.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {est.status !== "booked" ? (
                          <DeleteButton
                            id={est.id}
                            action={deleteEstimate}
                            label={`Delete ${est.estimateNumber ?? "estimate"}`}
                            confirmMessage={`Delete estimate ${est.estimateNumber ?? ""}? This cannot be undone.`}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-6 text-center text-sm text-slate-400">
                      No estimates {activeFilter === "all" ? "yet" : `with status "${activeFilter}"`}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}

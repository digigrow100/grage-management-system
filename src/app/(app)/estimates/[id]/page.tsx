import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ArrowLeft } from "lucide-react";
import {
  getCustomer,
  getEmployees,
  getEstimate,
  getVehicle,
} from "@/lib/supabase/queries";
import { deleteEstimate } from "@/lib/supabase/mutations";
import { formatCurrency, formatDate } from "@/lib/format";
import { EstimateStatusSelect } from "@/components/estimates/EstimateStatusSelect";
import { ConvertEstimateButton } from "@/components/estimates/ConvertEstimateButton";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estimate = await getEstimate(id);
  if (!estimate) notFound();

  const [customer, vehicle, employees] = await Promise.all([
    estimate.customerId ? getCustomer(estimate.customerId) : Promise.resolve(undefined),
    estimate.vehicleId ? getVehicle(estimate.vehicleId) : Promise.resolve(undefined),
    getEmployees(),
  ]);

  return (
    <>
      <TopBar
        title={estimate.estimateNumber ?? "Estimate"}
        subtitle={customer?.name ?? undefined}
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/estimates"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={15} /> Back to estimates
          </Link>
          {estimate.status !== "booked" ? (
            <DeleteButton
              id={estimate.id}
              action={deleteEstimate}
              label="Delete estimate"
              confirmMessage="Delete this estimate? This cannot be undone."
              redirectTo="/estimates"
            />
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Customer & vehicle" />
            <CardBody className="space-y-2 text-sm">
              {customer ? (
                <p>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {customer.name}
                  </Link>
                </p>
              ) : (
                <p className="text-slate-400">No customer linked</p>
              )}
              {vehicle ? (
                <p className="text-slate-500">
                  {vehicle.registration} · {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <CardBody className="space-y-3 text-sm">
              <EstimateStatusSelect estimateId={estimate.id} status={estimate.status} />
              <p className="text-slate-500">Issued: {formatDate(estimate.issueDate)}</p>
              <p className="text-slate-500">
                Valid until: {estimate.validUntil ? formatDate(estimate.validUntil) : "—"}
              </p>
              {estimate.notes ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{estimate.notes}</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Total" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT</span>
                <span>{formatCurrency(estimate.vatTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(estimate.total)}</span>
              </div>
              {estimate.status === "booked" && estimate.bookedJobId ? (
                <Link
                  href={`/jobs/${estimate.bookedJobId}`}
                  className="mt-2 inline-block text-xs font-medium text-accent-600 hover:underline"
                >
                  View linked job →
                </Link>
              ) : estimate.status === "accepted" ? (
                <div className="pt-2">
                  <ConvertEstimateButton estimateId={estimate.id} employees={employees} />
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Lines" />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 font-medium">Description</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Unit price</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lines.map((line) => (
                    <tr key={line.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 capitalize text-slate-500">{line.lineType}</td>
                      <td className="px-5 py-3">{line.description}</td>
                      <td className="px-5 py-3 text-slate-500">{line.quantity}</td>
                      <td className="px-5 py-3 text-slate-500">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatCurrency(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                  {estimate.lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 text-center text-sm text-slate-400">
                        No lines yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </main>
    </>
  );
}

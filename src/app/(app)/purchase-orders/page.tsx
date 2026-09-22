import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getParts, getPurchaseOrders, getSuppliers, getWarehouses } from "@/lib/supabase/queries";
import { CreatePurchaseOrderButton } from "@/components/forms/CreatePurchaseOrderModal";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PurchaseOrderStatus } from "@/lib/types";

const STATUS_TONE: Record<PurchaseOrderStatus, "neutral" | "amber" | "green" | "red"> = {
  draft: "neutral",
  ordered: "amber",
  partially_received: "amber",
  received: "green",
  cancelled: "red",
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

export default async function PurchaseOrdersPage() {
  const [orders, suppliers, warehouses, parts] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    getWarehouses(),
    getParts(),
  ]);
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  return (
    <>
      <TopBar title="Purchase Orders" subtitle={`${orders.length} orders`} />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <CreatePurchaseOrderButton suppliers={suppliers} warehouses={warehouses} parts={parts} />
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">PO #</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Expected</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const total = po.lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCost, 0);
                  return (
                    <tr key={po.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        <Link href={`/purchase-orders/${po.id}`} className="font-medium text-accent-600 hover:underline">
                          {po.poNumber ?? po.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {po.supplierId ? supplierById.get(po.supplierId)?.name ?? "—" : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatCurrency(total)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[po.status]}>{STATUS_LABELS[po.status]}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-400">
                      No purchase orders yet.
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

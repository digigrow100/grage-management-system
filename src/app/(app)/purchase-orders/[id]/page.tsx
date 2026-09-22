import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { getParts, getPurchaseOrder, getSuppliers, getWarehouses } from "@/lib/supabase/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { PurchaseOrderStatusSelect } from "@/components/purchase-orders/PurchaseOrderStatusSelect";
import { ReceivePurchaseOrderLineButton } from "@/components/forms/ReceivePurchaseOrderLineButton";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) notFound();

  const [suppliers, warehouses, parts] = await Promise.all([
    getSuppliers(),
    getWarehouses(),
    getParts(),
  ]);
  const supplier = po.supplierId ? suppliers.find((s) => s.id === po.supplierId) : undefined;
  const warehouse = po.warehouseId ? warehouses.find((w) => w.id === po.warehouseId) : undefined;
  const partById = new Map(parts.map((p) => [p.id, p]));
  const total = po.lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCost, 0);
  const canReceive = po.status === "ordered" || po.status === "partially_received";

  return (
    <>
      <TopBar title={po.poNumber ?? "Purchase Order"} subtitle={supplier?.name} />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <Link href="/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to purchase orders
        </Link>

        <div className="flex items-center justify-between">
          <PurchaseOrderStatusSelect purchaseOrderId={po.id} status={po.status} />
          <p className="text-sm text-slate-500">
            {po.orderDate ? `Ordered ${formatDate(po.orderDate)}` : "Not yet ordered"}
            {po.expectedDate ? ` · Expected ${formatDate(po.expectedDate)}` : ""}
          </p>
        </div>

        <Card>
          <CardHeader title="Supplier & delivery" />
          <CardBody className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Supplier</p>
              <p className="font-medium text-slate-900">{supplier?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Deliver to</p>
              <p className="font-medium text-slate-900">{warehouse?.name ?? "—"}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lines" subtitle={`Total ${formatCurrency(total)}`} />
          <CardBody className="space-y-2">
            {po.lines.map((line) => {
              const outstanding = line.quantityOrdered - line.quantityReceived;
              const part = line.partId ? partById.get(line.partId) : undefined;
              return (
                <div
                  key={line.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{line.description}</p>
                    <p className="text-xs text-slate-500">
                      {part ? `${part.sku} · ` : ""}
                      {line.quantityReceived} of {line.quantityOrdered} received ·{" "}
                      {formatCurrency(line.unitCost)} each
                    </p>
                  </div>
                  {canReceive && outstanding > 0 ? (
                    <ReceivePurchaseOrderLineButton
                      lineId={line.id}
                      outstanding={outstanding}
                      defaultUnitCost={line.unitCost}
                    />
                  ) : null}
                </div>
              );
            })}
            {po.lines.length === 0 ? (
              <p className="text-sm text-slate-400">No lines on this order.</p>
            ) : null}
          </CardBody>
        </Card>

        {po.notes ? (
          <Card>
            <CardHeader title="Notes" />
            <CardBody>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.notes}</p>
            </CardBody>
          </Card>
        ) : null}
      </main>
    </>
  );
}

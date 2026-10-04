import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/StatCard";
import {
  Boxes,
  Package,
  PackageSearch,
  Wallet,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getParts } from "@/lib/supabase/queries";
import { deletePart } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import { AddPartButton } from "@/components/forms/AddPartModal";
import { EditPartButton } from "@/components/forms/EditPartModal";

export default async function InventoryPage() {
  await requirePermission("inventory.manage", "inventory.view");
  const parts = await getParts();
  const lowStockCount = parts.filter(
    (p) => p.stockLevel <= p.reorderLevel,
  ).length;

  const outOfStock = parts.filter((part) => part.stockLevel <= 0).length;
  const stockValue = parts.reduce(
    (total, part) => total + Math.max(0, part.stockLevel) * part.costPrice,
    0,
  );

  return (
    <>
      <TopBar
        title="Parts & Inventory"
        subtitle={`${parts.length} parts tracked · ${lowStockCount} need reordering`}
      />
      <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Manage parts, prices, and stock levels.
          </p>
          <AddPartButton />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Parts tracked"
            value={String(parts.length)}
            icon={Boxes}
            tone="blue"
          />
          <StatCard
            label="Need reordering"
            value={String(lowStockCount)}
            icon={PackageSearch}
            tone={lowStockCount > 0 ? "amber" : "green"}
          />
          <StatCard
            label="Out of stock"
            value={String(outOfStock)}
            icon={Package}
            tone={outOfStock > 0 ? "red" : "green"}
          />
          <StatCard
            label="Stock value at cost"
            value={formatCurrency(stockValue)}
            icon={Wallet}
            tone="blue"
          />
        </div>
        {parts.length > 0 ? (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${lowStockCount > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
          >
            {lowStockCount > 0 ? (
              <TriangleAlert size={22} className="shrink-0 text-amber-600" />
            ) : (
              <ShieldCheck size={22} className="shrink-0 text-emerald-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {lowStockCount > 0
                  ? `${lowStockCount} part${lowStockCount === 1 ? "" : "s"} need reordering`
                  : "All parts are above reorder level."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {lowStockCount > 0
                  ? "Check the highlighted stock levels below."
                  : "No low stock alerts at the moment."}
              </p>
            </div>
          </div>
        ) : null}
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader
            title="Parts register"
            subtitle={`${parts.length} parts · stock levels and pricing`}
            icon={Boxes}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Part</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Cost / Sell</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => {
                  const isLow = p.stockLevel <= p.reorderLevel;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-50 last:border-0 ${isLow ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded-xl bg-accent-50 p-2.5 text-accent-600">
                            <Package size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {p.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {p.category || "Uncategorised"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
                          {p.sku || "Not recorded"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {p.supplier || "Not recorded"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            isLow
                              ? "rounded-lg bg-rose-50 px-2.5 py-1 text-base font-bold tabular-nums text-rose-700"
                              : "rounded-lg bg-emerald-50 px-2.5 py-1 text-base font-bold tabular-nums text-emerald-700"
                          }
                        >
                          {p.stockLevel}
                        </span>
                        <span className="mt-2 block text-xs text-slate-500">
                          {" "}
                          / reorder at {p.reorderLevel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        <p className="text-xs text-slate-500">
                          Cost{" "}
                          <span className="ml-1 font-medium text-slate-700">
                            {formatCurrency(p.costPrice)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Sell{" "}
                          <span className="ml-1 font-semibold text-slate-900">
                            {formatCurrency(p.sellPrice)}
                          </span>
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <Badge tone={p.stockLevel <= 0 ? "red" : "amber"}>
                            {p.stockLevel <= 0 ? "Out of stock" : "Reorder now"}
                          </Badge>
                        ) : (
                          <Badge tone="green">In stock</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditPartButton part={p} />
                          <DeleteButton
                            id={p.id}
                            action={deletePart}
                            label={`Delete ${p.name}`}
                            confirmMessage={`Delete ${p.name}? This cannot be undone.`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {parts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-6 text-center text-sm text-slate-400"
                    >
                      <div className="flex flex-col items-center py-5">
                        <Boxes size={32} className="mb-3 text-slate-400" />
                        <p className="font-semibold text-slate-900">
                          No parts tracked yet.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Add your first part to start tracking stock and
                          prices.
                        </p>
                      </div>
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

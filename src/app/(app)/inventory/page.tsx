import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
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
  const lowStockCount = parts.filter((p) => p.stockLevel <= p.reorderLevel).length;

  return (
    <>
      <TopBar
        title="Parts & Inventory"
        subtitle={`${parts.length} parts tracked · ${lowStockCount} need reordering`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddPartButton />
        </div>
        <Card>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
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
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {p.supplier}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          isLow
                            ? "font-semibold text-red-600"
                            : "text-slate-700"
                        }
                      >
                        {p.stockLevel}
                      </span>
                      <span className="text-slate-400">
                        {" "}
                        / reorder at {p.reorderLevel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatCurrency(p.costPrice)} /{" "}
                      {formatCurrency(p.sellPrice)}
                    </td>
                    <td className="px-5 py-3">
                      {isLow ? (
                        <Badge tone="red">Reorder now</Badge>
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
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-400">
                    No parts tracked yet.
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

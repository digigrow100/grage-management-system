import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getParts, getSuppliers } from "@/lib/supabase/queries";
import { deletePart } from "@/lib/supabase/mutations";
import { formatCurrency } from "@/lib/format";
import { AddPartButton } from "@/components/forms/AddPartModal";
import { EditPartButton } from "@/components/forms/EditPartModal";
import { cn } from "@/lib/cn";
import type { ProductType } from "@/lib/types";

const TYPE_TABS: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "part", label: "Parts" },
  { value: "tyre", label: "Tyres" },
  { value: "consumable", label: "Consumables" },
  { value: "wheel", label: "Wheels" },
];

const TYPE_LABELS: Record<ProductType, string> = {
  part: "Part",
  tyre: "Tyre",
  consumable: "Consumable",
  wheel: "Wheel",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = (type ?? "all") as ProductType | "all";

  const [parts, suppliers] = await Promise.all([getParts(), getSuppliers()]);
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const lowStockCount = parts.filter((p) => p.stockLevel <= p.reorderLevel).length;
  const filtered = activeType === "all" ? parts : parts.filter((p) => p.productType === activeType);

  return (
    <>
      <TopBar
        title="Parts & Inventory"
        subtitle={`${parts.length} items tracked · ${lowStockCount} need reordering`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_TABS.map((t) => (
              <Link
                key={t.value}
                href={t.value === "all" ? "/inventory" : `/inventory?type=${t.value}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeType === t.value
                    ? "bg-accent-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/suppliers"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Suppliers
            </Link>
            <Link
              href="/purchase-orders"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Purchase Orders
            </Link>
            <AddPartButton suppliers={suppliers} />
          </div>
        </div>
        <Card>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Part</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Cost / Sell</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isLow = p.stockLevel <= p.reorderLevel;
                const supplierName = p.supplierId ? supplierById.get(p.supplierId)?.name : p.supplier;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.category}
                        {p.productType === "tyre" && p.tyreWidth
                          ? ` · ${p.tyreWidth}/${p.tyreProfile ?? "-"} R${p.tyreRimSize ?? "-"}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{TYPE_LABELS[p.productType]}</td>
                    <td className="px-5 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {supplierName}
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
                        <EditPartButton part={p} suppliers={suppliers} />
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-slate-400">
                    No items match this filter.
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

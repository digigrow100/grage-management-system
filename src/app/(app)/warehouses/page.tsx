import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getWarehouses } from "@/lib/supabase/queries";
import { deleteWarehouse } from "@/lib/supabase/mutations";
import { AddWarehouseButton, EditWarehouseButton } from "@/components/forms/WarehouseModal";

export default async function WarehousesPage() {
  const warehouses = await getWarehouses();

  return (
    <>
      <TopBar title="Warehouses" subtitle={`${warehouses.length} stock locations`} />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddWarehouseButton />
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Address</th>
                  <th className="px-5 py-3 font-medium">Default</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-900">{w.name}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {[w.addressLine1, w.city, w.postcode].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {w.isDefault ? <Badge tone="green">Default</Badge> : null}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditWarehouseButton warehouse={w} />
                        <DeleteButton
                          id={w.id}
                          action={deleteWarehouse}
                          label={`Delete ${w.name}`}
                          confirmMessage={`Delete ${w.name}? This cannot be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-400">
                      No warehouses yet.
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

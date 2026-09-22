import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { getSuppliers } from "@/lib/supabase/queries";
import { deleteSupplier } from "@/lib/supabase/mutations";
import { AddSupplierButton, EditSupplierButton } from "@/components/forms/SupplierModal";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <>
      <TopBar title="Suppliers" subtitle={`${suppliers.length} suppliers on file`} />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddSupplierButton />
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Account #</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Email / Phone</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {[s.addressLine1, s.city, s.postcode].filter(Boolean).join(", ")}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.accountNumber ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{s.contactName ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {s.email ?? "—"} {s.phone ? `· ${s.phone}` : ""}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditSupplierButton supplier={s} />
                        <DeleteButton
                          id={s.id}
                          action={deleteSupplier}
                          label={`Delete ${s.name}`}
                          confirmMessage={`Delete ${s.name}? This cannot be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-400">
                      No suppliers yet.
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

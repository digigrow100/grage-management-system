"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronDown, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { restoreCustomer } from "@/lib/supabase/mutations";
import { formatDate } from "@/lib/format";
import { customerDisplayName, type Customer, type Vehicle } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

export function CustomersTable({
  customers,
  vehicles,
  archivedCustomers,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  archivedCustomers: Customer[];
}) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const vehiclesByCustomer = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    for (const v of vehicles) {
      const list = map.get(v.customerId) ?? [];
      list.push(v);
      map.set(v.customerId, list);
    }
    return map;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const customerVehicles = vehiclesByCustomer.get(c.id) ?? [];
      const haystack = [
        c.name,
        c.businessName,
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.city,
        c.postCode,
        c.address,
        ...customerVehicles.map((v) => v.registration),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [customers, search, vehiclesByCustomer]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, location, or vehicle registration..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
          />
        </div>
        {search ? (
          <p className="mt-2 text-xs text-slate-400">
            Showing {filtered.length} of {customers.length} customers
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Vehicles</th>
                <th className="px-5 py-3 font-medium">Customer since</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const customerVehicles = vehiclesByCustomer.get(c.id) ?? [];
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {customerDisplayName(c)}
                      </Link>
                      {c.customerType === "business" ? (
                        <Badge tone="purple" className="ml-2">
                          Business
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      <div>{c.email}</div>
                      <div>{c.phone}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {customerVehicles.length} vehicle{customerVehicles.length === 1 ? "" : "s"}
                      {customerVehicles.length > 0 ? (
                        <p className="text-xs text-slate-400">
                          {customerVehicles.map((v) => v.registration).join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <DeleteCustomerButton customerId={c.id} customerName={c.name} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-400">
                    {customers.length === 0
                      ? 'No customers yet. Click "New customer" to add one.'
                      : "No customers match your search."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {archivedCustomers.length > 0 ? (
        <Card>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Archive size={15} className="text-slate-400" />
              Archived customers ({archivedCustomers.length})
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${showArchived ? "rotate-180" : ""}`}
            />
          </button>
          {showArchived ? (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full text-sm">
                <tbody>
                  {archivedCustomers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-700">
                      {customerDisplayName(c)}
                    </td>
                      <td className="px-5 py-3 text-slate-500">{c.email}</td>
                      <td className="px-5 py-3 text-right">
                        <RestoreButton customerId={c.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function RestoreButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setPending(true);
    setError(null);
    const result = await restoreCustomer(customerId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRestore}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <ArchiveRestore size={13} />}
        {pending ? "Restoring..." : "Restore"}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

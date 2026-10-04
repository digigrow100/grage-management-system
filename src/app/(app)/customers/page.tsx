import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import {
  getActiveCustomers,
  getArchivedCustomers,
  getVehicles,
} from "@/lib/supabase/queries";
import { StatCard } from "@/components/ui/StatCard";
import { Users, Car, UserCheck, Archive } from "lucide-react";
import { AddCustomerButton } from "@/components/forms/AddCustomerModal";

export default async function CustomersPage() {
  await requirePermission("customers.manage", "customers.view");
  const [customers, vehicles, archivedCustomers] = await Promise.all([
    getActiveCustomers(),
    getVehicles(),
    getArchivedCustomers(),
  ]);

  const activeIds = new Set(customers.map((customer) => customer.id));
  const activeVehicles = vehicles.filter((vehicle) =>
    activeIds.has(vehicle.customerId),
  );
  const withVehicles = new Set(
    activeVehicles.map((vehicle) => vehicle.customerId),
  ).size;

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} customers on record`}
      />
      <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Manage customer records and their vehicles.
          </p>
          <AddCustomerButton />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Active customers"
            value={String(customers.length)}
            icon={Users}
            tone="blue"
          />
          <StatCard
            label="Vehicles on record"
            value={String(activeVehicles.length)}
            icon={Car}
            tone="amber"
          />
          <StatCard
            label="With vehicles"
            value={String(withVehicles)}
            icon={UserCheck}
            tone="green"
          />
          <StatCard
            label="Archived customers"
            value={String(archivedCustomers.length)}
            icon={Archive}
          />
        </div>
        <CustomersTable
          customers={customers}
          vehicles={vehicles}
          archivedCustomers={archivedCustomers}
        />
      </main>
    </>
  );
}

import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { getActiveCustomers, getArchivedCustomers, getVehicles } from "@/lib/supabase/queries";
import { AddCustomerButton } from "@/components/forms/AddCustomerModal";

export default async function CustomersPage() {
  await requirePermission("customers.manage", "customers.view");
  const [customers, vehicles, archivedCustomers] = await Promise.all([
    getActiveCustomers(),
    getVehicles(),
    getArchivedCustomers(),
  ]);

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} customers on record`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddCustomerButton />
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

import { TopBar } from "@/components/layout/TopBar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import {
  getActiveCustomers,
  getArchivedCustomers,
  getEmployees,
  getGarageSettings,
  getParts,
  getVehicles,
} from "@/lib/supabase/queries";
import { AddCustomerButton } from "@/components/forms/AddCustomerModal";

export default async function CustomersPage() {
  const [customers, vehicles, archivedCustomers, employees, parts, garage] = await Promise.all([
    getActiveCustomers(),
    getVehicles(),
    getArchivedCustomers(),
    getEmployees(),
    getParts(),
    getGarageSettings(),
  ]);

  return (
    <>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} customers on record`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddCustomerButton employees={employees} parts={parts} defaultVatRate={garage.defaultVatRate} />
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

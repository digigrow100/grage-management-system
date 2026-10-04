import { requirePermission } from "@/lib/supabase/permissions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { RestoreCustomerBanner } from "@/components/customers/RestoreCustomerBanner";
import {
  getBookingsForCustomer,
  getCustomer,
  getInvoicesForCustomer,
  getJobsForCustomer,
  getVehiclesForCustomer,
} from "@/lib/supabase/queries";
import { JOB_TYPE_LABELS } from "@/lib/job-types";
import { invoiceTotals } from "@/lib/totals";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Car,
  Gauge,
  Wrench,
  FileText,
  LayoutGrid,
  History,
} from "lucide-react";
import { EditCustomerButton } from "@/components/forms/EditCustomerModal";
import { AddVehicleButton } from "@/components/forms/AddVehicleModal";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE } from "@/lib/job-status";

const invoiceStatusTone: Record<
  string,
  "neutral" | "blue" | "green" | "amber" | "red" | "purple"
> = {
  estimate: "purple",
  draft: "neutral",
  sent: "blue",
  paid: "green",
  overdue: "red",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("customers.manage", "customers.view");
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const [vehicles, bookings, jobs, custInvoices] = await Promise.all([
    getVehiclesForCustomer(customer.id),
    getBookingsForCustomer(customer.id),
    getJobsForCustomer(customer.id),
    getInvoicesForCustomer(customer.id),
  ]);

  const { tab } = await searchParams;
  const activeTab = ["overview", "vehicles", "history", "invoices"].includes(
    tab ?? "",
  )
    ? tab!
    : "vehicles";
  const initials = customer.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const address = [customer.address, customer.city, customer.postCode]
    .filter(Boolean)
    .join(", ");
  const contact = [
    { label: "Phone", value: customer.phone || "Not recorded", icon: Phone },
    { label: "Email", value: customer.email || "Not recorded", icon: Mail },
    { label: "Address", value: address || "Not recorded", icon: MapPin },
    {
      label: "Customer since",
      value: formatDate(customer.createdAt),
      icon: CalendarDays,
    },
  ];
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "vehicles", label: "Vehicles", icon: Car },
    { id: "history", label: "History", icon: History },
    { id: "invoices", label: "Invoices", icon: FileText },
  ];

  const linkedBookingIds = new Set(jobs.map((job) => job.bookingId).filter(Boolean));
  const historyPanel = (
    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">
        Booking & job history
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {bookings.length} bookings · {jobs.length} job cards
      </p>
      <div className="mt-5 space-y-3">
        {jobs.length === 0 && bookings.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No booking or job history yet.
          </div>
        ) : null}
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
              <Wrench size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-slate-900">
                {job.description || "Untitled job"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(job.createdAt)} · {job.technician || "Unassigned"}
              </p>
            </div>
            <Badge tone={JOB_STATUS_TONE[job.status]}>
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </Link>
        ))}
        {bookings
          .filter(
            (booking) => !linkedBookingIds.has(booking.id),
          )
          .map((booking) => (
            <Link
              key={booking.id}
              href={`/diary?date=${booking.date}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <CalendarDays size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {JOB_TYPE_LABELS[booking.jobType]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(booking.date)} ·{" "}
                  {booking.time?.slice(0, 5) || "Time not set"}
                </p>
              </div>
              <Badge tone="blue">Booked</Badge>
            </Link>
          ))}
      </div>
    </section>
  );

  const invoicesPanel = (
    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">Invoices</h2>
      <p className="mt-1 text-xs text-slate-500">{custInvoices.length} total</p>
      {custInvoices.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-10 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileText size={28} />
          </span>
          <p className="text-sm font-semibold text-slate-900">
            No invoices yet.
          </p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
            Invoices for this customer will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {custInvoices.map((inv) => {
            const { total } = invoiceTotals(inv);
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv.number}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(inv.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(total)}
                  </p>
                  <Badge
                    tone={invoiceStatusTone[inv.status]}
                    className="capitalize"
                  >
                    {inv.status}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <>
      <TopBar title="Customer details" subtitle={customer.name} />
      <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-accent-600"
        >
          <ArrowLeft size={16} /> Back to customers
        </Link>
        {customer.archived ? (
          <RestoreCustomerBanner customerId={customer.id} />
        ) : null}
        <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col items-center pb-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-50 text-3xl font-bold text-accent-700">
                {initials || "?"}
              </div>
              <h1 className="mt-4 break-words text-xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              {customer.archived ? (
                <span className="mt-2 text-xs text-amber-700">
                  Archived customer
                </span>
              ) : null}
            </div>
            <dl className="space-y-5">
              {contact.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon
                    size={19}
                    className="mt-0.5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm leading-5 text-slate-900">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            {customer.notes ? (
              <div className="mt-5 rounded-xl bg-amber-50 p-3">
                <h2 className="text-xs font-semibold text-amber-900">Notes</h2>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-amber-800">
                  {customer.notes}
                </p>
              </div>
            ) : null}
            <div className="customer-profile-actions mt-6 flex items-center gap-2 border-t border-slate-100 pt-5">
              <EditCustomerButton customer={customer} profile />
              <DeleteCustomerButton
                customerId={customer.id}
                customerName={customer.name}
                redirectTo="/customers"
              />
            </div>
          </aside>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <nav
              aria-label="Customer sections"
              className="grid grid-cols-4 border-b border-slate-100 px-2 sm:px-5"
            >
              {tabs.map(({ id: tabId, label, icon: Icon }) => (
                <Link
                  key={tabId}
                  href={`/customers/${customer.id}?tab=${tabId}`}
                  scroll={false}
                  aria-current={activeTab === tabId ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1.5 border-b-2 px-1 py-4 text-[11px] font-medium sm:flex-row sm:gap-2 sm:text-sm ${activeTab === tabId ? "border-accent-600 text-accent-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="space-y-6 p-4 sm:p-6">
              {activeTab === "vehicles" || activeTab === "overview" ? (
                <section>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Vehicles
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicles.length} vehicle
                        {vehicles.length === 1 ? "" : "s"} on record
                      </p>
                    </div>
                    {!customer.archived ? (
                      <AddVehicleButton
                        customerId={customer.id}
                        customerName={customer.name}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {vehicles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                        <Car
                          size={28}
                          className="mx-auto mb-3 text-slate-400"
                        />
                        <p className="text-sm text-slate-500">
                          No vehicles on record.
                        </p>
                      </div>
                    ) : null}
                    {vehicles.map((v) => {
                      const days = v.motDue ? daysUntil(v.motDue) : null;
                      return (
                        <article
                          key={v.id}
                          className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                            <Car size={28} />
                          </div>
                          <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-5">
                            <div>
                              <p className="text-xs text-slate-500">
                                Registration
                              </p>
                              <p className="mt-2 inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-bold tracking-wide text-slate-900">
                                {v.registration}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Vehicle</p>
                              <p className="mt-2 break-words text-sm font-medium text-slate-900">
                                {[v.year, v.make, v.model]
                                  .filter(Boolean)
                                  .join(" ") || "Not recorded"}
                                {v.colour ? ` · ${v.colour}` : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Mileage</p>
                              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-900">
                                <Gauge
                                  size={15}
                                  className="shrink-0 text-slate-400"
                                />
                                {v.mileage != null
                                  ? `${v.mileage.toLocaleString()} mi`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">MOT due</p>
                              <div className="mt-2">
                                {v.motDue ? (
                                  <Badge
                                    tone={
                                      days !== null && days <= 14
                                        ? "amber"
                                        : "neutral"
                                    }
                                  >
                                    {formatDate(v.motDue)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    Not recorded
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">
                                Last service
                              </p>
                              <p className="mt-2 text-sm text-slate-900">
                                {v.lastServiceDate
                                  ? formatDate(v.lastServiceDate)
                                  : "Not recorded"}
                              </p>
                            </div>
                          </div>
                          {!customer.archived ? (
                            <AddVehicleButton
                              customerId={customer.id}
                              customerName={customer.name}
                              vehicle={v}
                            />
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {activeTab === "overview" || activeTab === "vehicles" ? (
                <div className="grid items-start gap-4 border-t border-slate-100 pt-6 lg:grid-cols-2">
                  {historyPanel}
                  {invoicesPanel}
                </div>
              ) : null}
              {activeTab === "history" ? historyPanel : null}
              {activeTab === "invoices" ? invoicesPanel : null}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

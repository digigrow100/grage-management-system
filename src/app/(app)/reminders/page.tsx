import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { getActiveCustomers, getCustomers, getReminders } from "@/lib/supabase/queries";
import { processDueReminders } from "@/lib/supabase/mutations";
import { AddReminderButton } from "@/components/forms/AddReminderModal";
import { ReminderRow } from "@/components/reminders/ReminderRow";
import { cn } from "@/lib/cn";
import type { Reminder, ReminderStatus, ReminderType } from "@/lib/types";

const STATUS_TABS: { value: ReminderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Upcoming" },
  { value: "sent", label: "Sent" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

const TYPE_TABS: { value: ReminderType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "mot", label: "MOT" },
  { value: "service", label: "Service" },
  { value: "booking", label: "Booking" },
  { value: "general", label: "General" },
];

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status, type, q } = await searchParams;
  const activeStatus = (status ?? "all") as ReminderStatus | "all";
  const activeType = (type ?? "all") as ReminderType | "all";
  const search = (q ?? "").trim().toLowerCase();

  // No scheduler runs processDueReminders() on a timer, so it's run
  // opportunistically here: any in_app reminder whose scheduled_at has
  // passed flips from "scheduled" to "sent" the next time someone opens
  // this page. Idempotent (WHERE status='scheduled'), so this is safe to
  // run on every load.
  await processDueReminders();

  const [reminders, customers, activeCustomers] = await Promise.all([
    getReminders(),
    getCustomers(),
    getActiveCustomers(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  function matches(r: Reminder): boolean {
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    if (activeType !== "all" && r.reminderType !== activeType) return false;
    if (search) {
      const customerName = r.customerId ? customerById.get(r.customerId)?.name : undefined;
      const haystack = [r.title, r.notes, customerName].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }

  const filtered = reminders.filter(matches);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = filtered.filter((r) => r.status === "scheduled" && r.dueDate < today);
  const rest = filtered.filter((r) => !(r.status === "scheduled" && r.dueDate < today));

  function buildHref(next: { status?: string; type?: string }) {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextType = next.type ?? type;
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextType && nextType !== "all") params.set("type", nextType);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/reminders?${qs}` : "/reminders";
  }

  return (
    <>
      <TopBar
        title="Reminders"
        subtitle={`${reminders.filter((r) => r.status === "scheduled").length} upcoming · ${overdue.length} overdue`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex justify-end">
          <AddReminderButton customers={activeCustomers} />
        </div>

        <Card className="p-4">
          <form action="/reminders" method="get" className="mb-3">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {type ? <input type="hidden" name="type" value={type} /> : null}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title, notes, or customer..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
            />
          </form>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.value}
                href={buildHref({ status: t.value })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeStatus === t.value
                    ? "bg-accent-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TYPE_TABS.map((t) => (
              <Link
                key={t.value}
                href={buildHref({ type: t.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeType === t.value
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </Card>

        {overdue.length > 0 ? (
          <Card>
            <CardHeader title="Overdue" subtitle="Past their due date" />
            <CardBody className="space-y-2">
              {overdue.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  customerName={r.customerId ? customerById.get(r.customerId)?.name : undefined}
                />
              ))}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Reminders" subtitle={`${rest.length} matching`} />
          <CardBody className="space-y-2">
            {rest.length === 0 ? (
              <p className="text-sm text-slate-400">No reminders match these filters.</p>
            ) : (
              rest.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  customerName={r.customerId ? customerById.get(r.customerId)?.name : undefined}
                />
              ))
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

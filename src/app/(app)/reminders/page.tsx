import { createClient } from "@/lib/supabase/server";
import { getCurrentGarageId } from "@/lib/supabase/garage";
import { ReminderSettings } from "@/components/workflows/WorkflowForms";
import { requirePermission } from "@/lib/supabase/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  getActiveCustomers,
  getCustomers,
  getReminders,
} from "@/lib/supabase/queries";
import { AddReminderButton } from "@/components/forms/AddReminderModal";
import { ReminderRow } from "@/components/reminders/ReminderRow";

export default async function RemindersPage() {
  await requirePermission("reminders.manage");
  const [reminders, customers, activeCustomers] = await Promise.all([
    getReminders(),
    getCustomers(),
    getActiveCustomers(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const supabase = await createClient(),
    garageId = await getCurrentGarageId();
  const [
    { data: config, error: configError },
    { data: deliveries, error: deliveryError },
  ] = await Promise.all([
    supabase
      .from("garage_settings")
      .select(
        "automatic_reminders,reminder_days_before,service_interval_months",
      )
      .eq("id", garageId)
      .single(),
    supabase
      .from("reminder_outbox")
      .select("id,recipient,subject,status,last_error")
      .eq("garage_id", garageId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (configError || deliveryError)
    throw new Error("Could not load reminder delivery settings.");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = reminders.filter((r) => !r.done && r.dueDate < today);
  const upcoming = reminders.filter((r) => !r.done && r.dueDate >= today);
  const done = reminders.filter((r) => r.done);

  return (
    <>
      <TopBar
        title="Reminders"
        subtitle={`${upcoming.length + overdue.length} open · ${overdue.length} overdue`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <ReminderSettings
          enabled={config?.automatic_reminders ?? false}
          days={config?.reminder_days_before ?? 14}
          months={config?.service_interval_months ?? 12}
        />
        {deliveries?.length ? (
          <Card>
            <CardHeader title="Email delivery history" />
            <CardBody>
              <ul className="space-y-3 text-sm">
                {deliveries.map((d) => (
                  <li key={d.id}>
                    <strong>{d.subject}</strong> · {d.recipient} · {d.status}
                    {d.last_error ? (
                      <p className="text-rose-700">{d.last_error}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
        <div className="flex justify-end">
          <AddReminderButton customers={activeCustomers} />
        </div>

        {overdue.length > 0 ? (
          <Card>
            <CardHeader title="Overdue" subtitle="Past their due date" />
            <CardBody className="space-y-2">
              {overdue.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  customerName={
                    r.customerId
                      ? customerById.get(r.customerId)?.name
                      : undefined
                  }
                />
              ))}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Upcoming" subtitle="Not yet due" />
          <CardBody className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming reminders.</p>
            ) : (
              upcoming.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  customerName={
                    r.customerId
                      ? customerById.get(r.customerId)?.name
                      : undefined
                  }
                />
              ))
            )}
          </CardBody>
        </Card>

        {done.length > 0 ? (
          <Card>
            <CardHeader title="Completed" />
            <CardBody className="space-y-2">
              {done.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  customerName={
                    r.customerId
                      ? customerById.get(r.customerId)?.name
                      : undefined
                  }
                />
              ))}
            </CardBody>
          </Card>
        ) : null}
      </main>
    </>
  );
}

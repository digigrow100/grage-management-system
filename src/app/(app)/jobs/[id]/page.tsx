import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  getCustomer,
  getEmployees,
  getJob,
  getJobStatusHistory,
  getParts,
  getVehicle,
  getVhcChecksForJob,
  getVhcTemplates,
  getFeedbackRequestsForJob,
} from "@/lib/supabase/queries";
import { getCurrentGarageId } from "@/lib/supabase/garage";
import { deleteJobCard } from "@/lib/supabase/mutations";
import { jobLineTotal } from "@/lib/totals";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, History } from "lucide-react";
import { JobStatusSelect } from "@/components/jobs/JobStatusSelect";
import { JobPrioritySelect } from "@/components/jobs/JobPrioritySelect";
import { JobTechnicianSelect } from "@/components/jobs/JobTechnicianSelect";
import { EditJobLinesButton } from "@/components/jobs/EditJobLinesModal";
import { JobDetailsForm } from "@/components/jobs/JobDetailsForm";
import { JOB_STATUS_LABELS } from "@/lib/job-status";
import { StartVhcCheckButton } from "@/components/vhc/StartVhcCheckButton";
import { VhcCheckPanel } from "@/components/vhc/VhcCheckPanel";
import { SendFeedbackRequestButton } from "@/components/feedback/SendFeedbackRequestButton";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const [customer, vehicle, employees, parts, statusHistory, vhcChecks, vhcTemplates, garageId, feedbackRequests] =
    await Promise.all([
      getCustomer(job.customerId),
      job.vehicleId ? getVehicle(job.vehicleId) : Promise.resolve(undefined),
      getEmployees(),
      getParts(),
      getJobStatusHistory(job.id),
      getVhcChecksForJob(job.id),
      getVhcTemplates(),
      getCurrentGarageId(),
      getFeedbackRequestsForJob(job.id),
    ]);
  const activeEmployees = employees.filter((e) => e.active);
  const latestVhcCheck = vhcChecks[0];
  const hasActiveVhcCheck = latestVhcCheck?.status === "in_progress";
  const { labour, partsTotal, total } = jobLineTotal(job);

  return (
    <>
      <TopBar
        title={vehicle ? `Job — ${vehicle.registration}` : "Job"}
        subtitle={job.description ?? undefined}
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/jobs"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={15} /> Back to job board
          </Link>
          <DeleteButton
            id={job.id}
            action={deleteJobCard}
            label="Delete job"
            confirmMessage="Delete this job? This cannot be undone."
            redirectTo="/jobs"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Customer & vehicle" />
            <CardBody className="space-y-2 text-sm">
              <p>
                <Link
                  href={`/customers/${customer?.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {customer?.name}
                </Link>
              </p>
              <p className="text-slate-500">{customer?.phone}</p>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="font-medium text-slate-900">
                  {vehicle?.registration ?? "No vehicle assigned"}
                </p>
                <p className="text-slate-500">
                  {vehicle
                    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
                    : null}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Job status" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <JobStatusSelect jobId={job.id} status={job.status} />
                <JobPrioritySelect jobId={job.id} priority={job.priority} />
              </div>
              <JobTechnicianSelect
                jobId={job.id}
                employeeId={job.employeeId}
                employees={activeEmployees}
              />
              <p className="text-slate-500">
                Created: {formatDate(job.createdAt)}
              </p>
              <p className="text-slate-500">
                Due: {job.dueDate ? formatDate(job.dueDate) : "—"}
              </p>
              <p className="text-slate-500">
                Items: {job.labourLines.length + job.partLines.length}
              </p>
              {job.notes ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                  {job.notes}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Job total" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Labour</span>
                <span>{formatCurrency(labour)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parts</span>
                <span>{formatCurrency(partsTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {job.invoiceId ? (
                <Link
                  href={`/invoices/${job.invoiceId}`}
                  className="mt-2 inline-block text-xs font-medium text-accent-600 hover:underline"
                >
                  View linked invoice →
                </Link>
              ) : (
                <p className="text-xs text-slate-400">
                  Not yet invoiced
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Job details" subtitle="Mileage, complaint and internal notes" />
            <CardBody>
              <JobDetailsForm
                jobId={job.id}
                mileageIn={job.mileageIn}
                customerComplaint={job.customerComplaint}
                internalNotes={job.internalNotes}
                hasVehicle={Boolean(job.vehicleId)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Status history"
              subtitle={`${statusHistory.length} change${statusHistory.length === 1 ? "" : "s"}`}
            />
            <CardBody className="space-y-3">
              {statusHistory.length === 0 ? (
                <p className="text-sm text-slate-400">No status changes recorded yet.</p>
              ) : (
                statusHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 text-sm">
                    <History size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-slate-900">
                        {entry.previousStatus ? (
                          <>
                            {JOB_STATUS_LABELS[entry.previousStatus]} →{" "}
                            <span className="font-medium">{JOB_STATUS_LABELS[entry.newStatus]}</span>
                          </>
                        ) : (
                          <span className="font-medium">{JOB_STATUS_LABELS[entry.newStatus]}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                      {entry.reason ? (
                        <p className="text-xs text-slate-500">{entry.reason}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Vehicle Health Check"
            subtitle={
              vhcChecks.length === 0
                ? "Not started"
                : `${vhcChecks.length} check${vhcChecks.length === 1 ? "" : "s"} on this job`
            }
            action={
              !hasActiveVhcCheck ? (
                <StartVhcCheckButton jobId={job.id} templates={vhcTemplates} employees={activeEmployees} />
              ) : undefined
            }
          />
          <CardBody>
            {latestVhcCheck ? (
              <VhcCheckPanel check={latestVhcCheck} jobId={job.id} garageId={garageId} />
            ) : (
              <p className="text-sm text-slate-400">
                No health check has been performed on this job yet.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Customer feedback"
            subtitle="Send a link for the customer to rate their experience"
            action={<SendFeedbackRequestButton jobId={job.id} customerId={job.customerId} />}
          />
          <CardBody className="space-y-2">
            {feedbackRequests.length === 0 ? (
              <p className="text-sm text-slate-400">No feedback requests sent for this job yet.</p>
            ) : (
              feedbackRequests.map((fr) => (
                <div
                  key={fr.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="text-slate-900">
                      Sent {formatDate(fr.sentAt)}
                      {fr.respondedAt ? ` · Responded ${formatDate(fr.respondedAt)}` : ""}
                    </p>
                    {fr.comment ? <p className="text-xs text-slate-500">&ldquo;{fr.comment}&rdquo;</p> : null}
                  </div>
                  {fr.npsScore !== null ? (
                    <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                      {fr.npsScore}/10
                    </span>
                  ) : (
                    <span className="text-xs capitalize text-slate-400">{fr.status}</span>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Labour lines"
            action={<EditJobLinesButton job={job} parts={parts} />}
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium">Hours</th>
                  <th className="px-5 py-2 font-medium">Rate</th>
                  <th className="px-5 py-2 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {job.labourLines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">{line.description}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {line.hours}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatCurrency(line.rate)}/hr
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {formatCurrency(line.hours * line.rate)}
                    </td>
                  </tr>
                ))}
                {job.labourLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-center text-sm text-slate-400">
                      No labour lines yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Parts used" subtitle="Parts allocated to this job" />
          <CardBody className="p-0">
            {job.partLines.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">
                No parts allocated to this job.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-2 font-medium">Part</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Unit price</th>
                    <th className="px-5 py-2 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {job.partLines.map((line) => (
                    <tr key={line.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">{line.description}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {line.quantity}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatCurrency(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

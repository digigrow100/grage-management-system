import { getVehicleHistoryByToken } from "@/lib/supabase/mutations";
import { formatDate } from "@/lib/format";
import { JOB_TYPE_LABELS } from "@/lib/job-types";
import { Gauge, ShieldCheck, Wrench } from "lucide-react";
import type { JobType } from "@/lib/types";

export default async function PublicVehicleHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const history = await getVehicleHistoryByToken(token);

  if (!history.valid || !history.vehicle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-8">
          <p className="text-lg font-semibold text-slate-900">This link isn&apos;t available</p>
          <p className="mt-1 text-sm text-slate-500">
            It may have been revoked. Please contact the garage directly if you need your vehicle&apos;s
            service history.
          </p>
        </div>
      </main>
    );
  }

  const { vehicle, jobs = [], mileageHistory = [], garageName } = history;
  const latestMileage = mileageHistory[0]?.mileage ?? null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-600">
            {garageName ?? "Service History"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Your vehicle"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {vehicle.registration}
            {vehicle.colour ? ` · ${vehicle.colour}` : ""}
            {latestMileage !== null ? ` · ${latestMileage.toLocaleString()} miles` : ""}
          </p>
        </div>

        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
              No completed services recorded yet.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Wrench size={14} className="text-accent-600" />
                      {job.jobType ? JOB_TYPE_LABELS[job.jobType as JobType] : "Service"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {job.completedAt ? formatDate(job.completedAt) : "Date unknown"}
                      {job.mileageIn !== null ? ` · ${job.mileageIn.toLocaleString()} miles` : ""}
                    </p>
                  </div>
                  {job.vhcSummary ? (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <ShieldCheck size={13} />
                      <span className="text-emerald-600">{job.vhcSummary.green}</span>/
                      <span className="text-amber-600">{job.vhcSummary.amber}</span>/
                      <span className="text-rose-600">{job.vhcSummary.red}</span>
                    </div>
                  ) : null}
                </div>

                {job.description || job.customerComplaint ? (
                  <p className="mt-3 text-sm text-slate-600">{job.description ?? job.customerComplaint}</p>
                ) : null}

                {job.labourLines.length > 0 || job.partLines.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {job.labourLines.map((l, i) => (
                      <li key={`l-${i}`}>{l.description}</li>
                    ))}
                    {job.partLines.map((p, i) => (
                      <li key={`p-${i}`}>
                        {p.description} {p.quantity > 1 ? `×${p.quantity}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>

        {mileageHistory.length > 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Gauge size={14} className="text-accent-600" /> Mileage log
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {mileageHistory.map((m, i) => (
                <li key={i} className="flex justify-between">
                  <span>{formatDate(m.recordedAt)}</span>
                  <span className="font-medium">{m.mileage.toLocaleString()} miles</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}

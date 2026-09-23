import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Wrench } from "lucide-react";
import type { JobCard } from "@/lib/types";

export function LinkedJobsList({ jobs }: { jobs: JobCard[] }) {
  if (jobs.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Jobs on this invoice" subtitle={`${jobs.length} job${jobs.length === 1 ? "" : "s"} batched`} />
      <CardBody className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Wrench size={14} className="text-slate-400" />
            {job.jobNumber ?? job.description ?? "Job"}
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}

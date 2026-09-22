import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { getCustomers, getFeedbackRequests, getFeedbackStats } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/format";
import { Gauge, MessageSquareHeart, ThumbsDown, ThumbsUp } from "lucide-react";
import type { FeedbackRequestStatus } from "@/lib/types";

const STATUS_TONE: Record<FeedbackRequestStatus, "neutral" | "amber" | "green" | "red"> = {
  sent: "neutral",
  opened: "amber",
  responded: "green",
  expired: "red",
};

export default async function FeedbackPage() {
  const [requests, stats, customers] = await Promise.all([
    getFeedbackRequests(),
    getFeedbackStats(),
    getCustomers(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <>
      <TopBar title="Customer Feedback" subtitle="NPS and feedback requests sent after jobs" />
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="NPS score"
            value={stats.npsScore === null ? "—" : String(stats.npsScore)}
            icon={Gauge}
            tone="blue"
            hint={`${stats.totalResponses} response${stats.totalResponses === 1 ? "" : "s"}`}
          />
          <StatCard label="Promoters (9-10)" value={String(stats.promoters)} icon={ThumbsUp} tone="green" />
          <StatCard label="Passives (7-8)" value={String(stats.passives)} icon={MessageSquareHeart} tone="neutral" />
          <StatCard label="Detractors (0-6)" value={String(stats.detractors)} icon={ThumbsDown} tone="red" />
        </div>

        <Card>
          <CardHeader title="Requests" subtitle={`${requests.length} sent`} />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Job</th>
                    <th className="px-5 py-3 font-medium">Sent</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((fr) => (
                    <tr key={fr.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 text-slate-900">
                        {customerById.get(fr.customerId)?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/jobs/${fr.jobId}`} className="text-accent-600 hover:underline">
                          View job
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(fr.sentAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[fr.status]}>{fr.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{fr.npsScore ?? "—"}</td>
                      <td className="px-5 py-3 max-w-xs truncate text-slate-500">{fr.comment ?? ""}</td>
                    </tr>
                  ))}
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-400">
                        No feedback requests sent yet. Send one from a completed job.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </main>
    </>
  );
}

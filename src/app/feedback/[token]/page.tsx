import { openFeedbackRequestByToken } from "@/lib/supabase/mutations";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = await openFeedbackRequestByToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {!request || request.requestStatus === "not_found" || request.expired ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">This link isn&apos;t available</p>
            <p className="mt-1 text-sm text-slate-500">
              It may have expired or already been used. Please contact the garage directly if you&apos;d
              like to leave feedback.
            </p>
          </div>
        ) : request.alreadyResponded ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">You&apos;ve already responded</p>
            <p className="mt-1 text-sm text-slate-500">Thanks again for your feedback!</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-accent-600">
              {request.garageName ?? "Feedback"}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              How was your visit{request.vehicleLabel ? ` with your ${request.vehicleLabel}` : ""}?
            </h1>
            {request.customerName ? (
              <p className="mt-1 text-sm text-slate-500">Hi {request.customerName.split(" ")[0]},</p>
            ) : null}
            <div className="mt-6">
              <FeedbackForm token={token} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

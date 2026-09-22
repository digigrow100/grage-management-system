"use client";

import { useState } from "react";
import { submitFeedbackResponseByToken } from "@/lib/supabase/mutations";
import { cn } from "@/lib/cn";

export function FeedbackForm({ token }: { token: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (score === null) return;
    setSubmitting(true);
    setError(null);

    const result = await submitFeedbackResponseByToken(token, score, comment || undefined);

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">Thank you for your feedback!</p>
        <p className="mt-1 text-sm text-emerald-700">We appreciate you taking the time to let us know.</p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium text-slate-700">
          How likely are you to recommend us to a friend or colleague?
        </p>
        <div className="mt-3 grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors",
                score === n
                  ? "bg-accent-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="text-sm font-medium text-slate-700">
          Anything you&apos;d like to add? (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10"
        />
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting || score === null}
        className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit feedback"}
      </button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { requestReset } from "./actions";
export default function ForgotPassword() {
  const [state, action, pending] = useActionState(requestReset, {});
  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email to receive a password reset link."
    >
      <form action={action} className="space-y-5">
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-2 block w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-rose-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-emerald-700">
            If an account exists, a reset link has been sent. Check your inbox
            and spam folder.
          </p>
        ) : null}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-accent-600 p-3 text-white disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send reset link"}
        </button>
        <Link
          href="/login"
          className="block text-center text-sm text-accent-600"
        >
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}

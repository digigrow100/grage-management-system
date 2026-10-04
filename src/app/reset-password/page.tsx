"use client";
import { useActionState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { resetPassword } from "./actions";
export default function ResetPassword() {
  const [state, action, pending] = useActionState(resetPassword, {});
  return (
    <AuthLayout
      title="Choose a new password."
      description="Use at least 8 characters."
    >
      <form action={action} className="space-y-5">
        {["password", "confirm"].map((name) => (
          <label key={name} className="block text-sm font-medium">
            {name === "password" ? "New password" : "Confirm password"}
            <input
              type="password"
              name={name}
              minLength={8}
              required
              autoComplete="new-password"
              className="mt-2 block w-full rounded-lg border border-slate-200 p-3"
            />
          </label>
        ))}
        {state.error ? (
          <p role="alert" className="text-sm text-rose-700">
            {state.error}
          </p>
        ) : null}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-accent-600 p-3 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}

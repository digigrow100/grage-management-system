"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, Mail } from "lucide-react";
import { signUp, type AuthActionState } from "@/lib/supabase/actions";
import { FieldGroup, TextInput } from "@/components/ui/Field";

import AuthLayout from "@/components/auth/AuthLayout";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <AuthLayout title="Create your account." description="Get started with your workshop console.">
          {state.success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </span>
              <p className="text-sm font-medium text-slate-900">
                Check your email to confirm your account
              </p>
              <p className="text-sm text-slate-500">
                Once confirmed, you can sign in below.
              </p>
              <Link
                href="/login"
                className="mt-2 w-full rounded-lg bg-accent-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm shadow-accent-600/30 hover:bg-accent-700"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-5" action={formAction}>
              <FieldGroup label="Email" htmlFor="email" required>
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  icon={Mail}
                  required
                  autoComplete="email"
                  placeholder="you@garage.com"
                />
              </FieldGroup>

              <FieldGroup label="Password" htmlFor="password" required hint="Min. 6 characters">
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  icon={Lock}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </FieldGroup>

              {state.error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-accent-600/30 transition-colors hover:bg-accent-700 disabled:opacity-60"
              >
                {pending ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-600 hover:underline">
            Sign in
          </Link>
        </p>
    </AuthLayout>
  );
}

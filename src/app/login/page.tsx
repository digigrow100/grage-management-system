"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { signIn, type AuthActionState } from "@/lib/supabase/actions";
import { FieldGroup, TextInput } from "@/components/ui/Field";

import AuthLayout from "@/components/auth/AuthLayout";

const initialState: AuthActionState = {};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="next" value={next} />

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

      <FieldGroup label="Password" htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          icon={Lock}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </FieldGroup>

      <Link href="/forgot-password" className="block text-right text-sm text-accent-600 hover:underline">Forgot password?</Link>

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
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back." description="Sign in to manage your bookings, jobs and invoices.">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading sign in...</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-slate-500">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-accent-600 hover:underline">Create one</Link>
      </p>
    </AuthLayout>
  );
}

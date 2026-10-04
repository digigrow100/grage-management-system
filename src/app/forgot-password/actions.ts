"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
export async function requestReset(
  _previous: { error?: string; success?: boolean },
  form: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid email address." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback`,
  });
  if (error)
    return {
      error: "Unable to request a reset. Please wait a moment and try again.",
    };
  return { success: true };
}

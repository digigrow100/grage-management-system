"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function resetPassword(
  _previous: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== form.get("confirm"))
    return { error: "Passwords do not match." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "The reset link has expired. Please request another one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  redirect("/login?password=updated");
}

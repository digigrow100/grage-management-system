import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code"),
    token = url.searchParams.get("token_hash");
  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/reset-password", url.origin));
  }
  if (token && url.searchParams.get("type") === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });
    if (!error)
      return NextResponse.redirect(new URL("/reset-password", url.origin));
  }
  return NextResponse.redirect(
    new URL("/forgot-password?error=expired", url.origin),
  );
}

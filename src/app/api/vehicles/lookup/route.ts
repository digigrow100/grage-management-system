import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarageId } from "@/lib/supabase/garage";
import { lookupVehicleByRegistration } from "@/lib/dvla/client";

// Simple in-memory rate limit: per garage, per process. Good enough for a
// single-instance deployment; swap for a shared store (e.g. Upstash) if the
// app ever runs multiple instances behind a load balancer.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let garageId: string;
  try {
    garageId = await getCurrentGarageId();
  } catch {
    return NextResponse.json({ error: "No garage membership found." }, { status: 403 });
  }

  if (isRateLimited(garageId)) {
    return NextResponse.json(
      { error: "Too many lookups right now. Try again in a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const registration =
    body && typeof body === "object" && "registration" in body
      ? String((body as { registration: unknown }).registration ?? "")
      : "";

  if (!registration.trim()) {
    return NextResponse.json({ error: "A registration is required." }, { status: 400 });
  }

  const result = await lookupVehicleByRegistration(registration);

  if (!result.ok) {
    const statusCode =
      result.status === "not_found"
        ? 404
        : result.status === "invalid"
          ? 400
          : result.status === "rate_limited"
            ? 429
            : result.status === "not_configured"
              ? 503
              : 502;
    return NextResponse.json({ error: result.message, status: result.status }, { status: statusCode });
  }

  return NextResponse.json({ vehicle: result.vehicle });
}

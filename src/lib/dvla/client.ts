import type { DvlaLookupErrorBody, DvlaLookupResult } from "./types";

const DVLA_ENDPOINT =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";
const REQUEST_TIMEOUT_MS = 8000;

/** Uppercase, strip spaces — matches vehicles.registration_normalized. */
export function normalizeRegistration(registration: string): string {
  return registration.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidUkRegistrationShape(normalized: string): boolean {
  // Deliberately permissive (covers current, prefix, suffix and dateless
  // formats) — DVLA is the real validator; this just filters obvious junk
  // before spending an API call.
  return /^[A-Z0-9]{2,8}$/.test(normalized);
}

/**
 * Calls the DVLA Vehicle Enquiry Service. Server-only: never import this
 * from a Client Component. Requires DVLA_API_KEY (server-side env var,
 * never NEXT_PUBLIC_*) — if it isn't configured, returns a clear
 * "not_configured" result rather than throwing or fabricating data.
 */
export async function lookupVehicleByRegistration(
  registration: string
): Promise<DvlaLookupResult> {
  const apiKey = process.env.DVLA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: "not_configured",
      message:
        "DVLA lookup isn't configured for this garage yet. Enter vehicle details manually.",
    };
  }

  const normalized = normalizeRegistration(registration);
  if (!isValidUkRegistrationShape(normalized)) {
    return {
      ok: false,
      status: "invalid",
      message: "That doesn't look like a valid vehicle registration.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DVLA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ registrationNumber: normalized }),
      signal: controller.signal,
    });

    if (response.ok) {
      const vehicle = await response.json();
      return { ok: true, vehicle };
    }

    if (response.status === 404) {
      return {
        ok: false,
        status: "not_found",
        message: "No vehicle found for that registration.",
      };
    }

    if (response.status === 400) {
      return {
        ok: false,
        status: "invalid",
        message: "That registration wasn't accepted by DVLA. Check it and try again.",
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        status: "rate_limited",
        message: "Too many lookups right now. Try again in a moment.",
      };
    }

    // 5xx and anything else unexpected — never log the key, and don't leak
    // the raw upstream body (may not be sanitized).
    const body = (await response.json().catch(() => null)) as DvlaLookupErrorBody | null;
    const detail = body?.errors?.[0]?.detail;
    return {
      ok: false,
      status: "upstream_error",
      message: detail
        ? `DVLA lookup failed: ${detail}`
        : "DVLA lookup failed. Try again, or enter the vehicle manually.",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        status: "upstream_error",
        message: "DVLA lookup timed out. Try again, or enter the vehicle manually.",
      };
    }
    return {
      ok: false,
      status: "upstream_error",
      message: "DVLA lookup failed. Try again, or enter the vehicle manually.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

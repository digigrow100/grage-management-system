import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function getDefaultKey(envName: string, legacyName: string) {
  const dictionary = Deno.env.get(envName);
  if (dictionary) {
    const parsed = JSON.parse(dictionary);
    if (parsed?.default) return parsed.default as string;
  }
  return Deno.env.get(legacyName) ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishableKey || !secretKey) {
      return json({ error: "Supabase function secrets are not configured" }, 500);
    }

    const token = authHeader.slice(7);
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const garageId = String(body.garageId ?? "");
    const roleId = String(body.roleId ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!garageId || !roleId || !email.includes("@")) {
      return json({ error: "Garage, role and valid email are required" }, 400);
    }

    const { data: membership } = await admin
      .from("garage_members")
      .select("role")
      .eq("garage_id", garageId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json({ error: "Only an owner or admin can add users" }, 403);
    }

    const { data: role } = await admin
      .from("garage_roles")
      .select("id")
      .eq("garage_id", garageId)
      .eq("id", roleId)
      .maybeSingle();

    if (!role) return json({ error: "Invalid role" }, 400);

    const { error: inviteRowError } = await admin
      .from("garage_invites")
      .upsert(
        {
          garage_id: garageId,
          email,
          role_id: roleId,
          invited_by: user.id,
          accepted_at: null,
        },
        { onConflict: "garage_id,email" },
      );

    if (inviteRowError) return json({ error: inviteRowError.message }, 400);

    const { data: inviteRow } = await admin
      .from("garage_invites")
      .select("accepted_at")
      .eq("garage_id", garageId)
      .eq("email", email)
      .single();

    if (inviteRow?.accepted_at) {
      return json({ success: true, status: "added_existing_user" });
    }

    const { error: authInviteError } = await admin.auth.admin.inviteUserByEmail(email);
    if (authInviteError) {
      const message = authInviteError.message.toLowerCase();
      if (!message.includes("already") && !message.includes("registered")) {
        return json({ error: authInviteError.message }, 400);
      }
    }

    return json({ success: true, status: "invited" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

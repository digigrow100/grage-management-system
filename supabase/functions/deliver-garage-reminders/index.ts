import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!,
      anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = request.headers.get("Authorization"),
      token = request.headers.get("x-worker-key");
    const client = createClient(url, anon, {
      global: {
        headers: authorization ? { Authorization: authorization } : {},
      },
      auth: { persistSession: false },
    });
    let garage: string | null = null;
    if (!token) {
      if (!authorization) return reply({ error: "Unauthorized" }, 401);
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error || !user) return reply({ error: "Unauthorized" }, 401);
      const body = await request.json();
      garage = body.garageId;
      if (!garage) return reply({ error: "Garage required" }, 400);
      const { data: permissions, error: permissionError } = await client.rpc(
        "my_garage_permissions",
        { p_garage: garage },
      );
      if (
        permissionError ||
        !permissions?.some((p: string) => p === "*" || p === "reminders.manage")
      )
        return reply({ error: "Unauthorized" }, 403);
    }
    const key = Deno.env.get("RESEND_API_KEY"),
      from = Deno.env.get("REMINDER_FROM_EMAIL");
    // Do not claim work until the sender is configured, so failures do not consume retries.
    if (!key || !from)
      return reply(
        {
          error:
            "Set RESEND_API_KEY and REMINDER_FROM_EMAIL in Supabase function secrets.",
        },
        503,
      );
    const { data: batch, error } = await client.rpc("claim_reminder_delivery", {
      p_token: token,
      p_garage: garage,
    });
    if (error) return reply({ error: "Unauthorized reminder worker" }, 401);
    let sent = 0,
      failed = 0;
    for (const item of batch ?? []) {
      let success = false,
        message: string | null = null;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `garage-reminder-${item.id}`,
          },
          body: JSON.stringify({
            from,
            to: [item.recipient],
            subject: item.subject,
            text: item.body,
          }),
          signal: AbortSignal.timeout(15000),
        });
        success = response.ok;
        if (!success)
          message = `Email provider returned HTTP ${response.status}. Check sender verification and provider logs.`;
      } catch {
        message = "Email provider unavailable. Delivery will retry.";
      }
      const { error: ackError } = await client.rpc("finish_reminder_delivery", {
        p_id: item.id,
        p_token: token,
        p_success: success,
        p_error: message,
      });
      if (ackError)
        return reply(
          { error: "Could not record delivery status. Check function logs." },
          500,
        );
      if (success) sent++;
      else failed++;
    }
    return reply({ sent, failed });
  } catch {
    return reply({ error: "Could not process reminders" }, 500);
  }
});

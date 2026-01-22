// app/api/offchain/staking/create/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const timestamp = new Date().toISOString();

    const webhookUrl = process.env.ZAPIER_STAKING_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("Missing ZAPIER_STAKING_WEBHOOK_URL env var");
          return new Response(JSON.stringify({ ok: false, forwarded: false, error: "Missing ZAPIER_STAKING_WEBHOOK_URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });

    }

    const wallet = String(body.wallet ?? "").trim();
    const amount = Number(body.amount ?? 0);
    const lockSeconds = Number(body.lockSeconds ?? 0);
    const apr = Number(body.apr ?? 0);

    if (!wallet) {
      return new Response(JSON.stringify({ ok: false, error: "Missing wallet" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid amount" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const startTime = Math.floor(Date.now() / 1000);
    const endTime = lockSeconds > 0 ? startTime + lockSeconds : 0;

const safePayload = {
  timestamp,

  // keep this if you want, but make it simple/consistent
  type: "stake",

  status: "active",

  wallet,
  amount,
  apr,

  // ✅ send both variants so Sheets columns always get filled
  lockSeconds,
  lockseconds: lockSeconds,

  startTime,
  starttime: startTime,

  endTime,
  endtime: endTime,

  // optional
  note: body.note ?? null,
};


    console.log("Forwarding staking create to Zapier:", safePayload);

    const zapRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
    });

    const zapText = await zapRes.text().catch(() => "");
    console.log("Zapier staking response:", zapRes.status, zapText);

    // ✅ ONLY return ok:true if Zapier actually accepted the hook (2xx)
    const ok = zapRes.ok;

    return new Response(
      JSON.stringify({
        ok,
        forwarded: ok,
        zapierStatus: zapRes.status,
        zapierBody: zapText, // helpful for debugging
      }),
      {
        // if Zapier failed, make HTTP fail too so res.ok becomes false on client
        status: ok ? 200 : 502,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Error in /api/offchain/staking/create:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

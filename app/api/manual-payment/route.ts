// app/api/manual-payment/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const timestamp = new Date().toISOString();

    const webhookUrl = process.env.ZAPIER_MANUAL_PAYMENT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("Missing ZAPIER_MANUAL_PAYMENT_WEBHOOK_URL env var");
      // Still respond OK so the user doesn't see an error
      return new Response(JSON.stringify({ ok: false, forwarded: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Forward to Zapier webhook
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        timestamp,
      }),
    });

    return new Response(JSON.stringify({ ok: true, forwarded: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in /api/manual-payment:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

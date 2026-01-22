// app/api/manual-payment/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const timestamp = new Date().toISOString();

    const webhookUrl = process.env.ZAPIER_MANUAL_PAYMENT_WEBHOOK_URL;
    console.log("ZAPIER_MANUAL_PAYMENT_WEBHOOK_URL:", webhookUrl);


    if (!webhookUrl) {
      console.error("Missing ZAPIER_MANUAL_PAYMENT_WEBHOOK_URL env var");
      // respond OK so user doesn't see an error
      return new Response(JSON.stringify({ ok: false, forwarded: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- Normalize / enforce fields ----
    const allowedStatuses = new Set(["pending", "confirmed", "rejected", "sent"]);
    const statusRaw = String(body.status ?? "").trim().toLowerCase();
    const status = allowedStatuses.has(statusRaw) ? statusRaw : "pending";

    // allow both flows (auto wallet + manual form)
    const paymentMode =
      body.paymentMode === "auto" || body.paymentMode === "manual"
        ? body.paymentMode
        : "manual";

    const userWallet = String(body.userWallet ?? "").trim();
    const receiveAddress = String(body.receiveAddress ?? "").trim() || userWallet;

    // only require receiveAddress for manual submissions
    if (paymentMode === "manual" && !receiveAddress) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing receiveAddress" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // clean payload (stable keys for Zapier + Sheets)
    const safePayload = {
      timestamp,
      status,
      paymentMode,

      method: body.method ?? null,
      chainId: body.chainId ?? null,
      txHash: body.txHash ?? null,
      toAddress: body.toAddress ?? null,

      userWallet: userWallet || null,
      receiveAddress: receiveAddress || null,
      email: body.email ?? null,
      referralCode: body.referralCode ?? null,

      omixAmount: body.omixAmount ?? null,
      estimatedCoinAmount: body.estimatedCoinAmount ?? null,
      estimatedUsdCost: body.estimatedUsdCost ?? null,
    };

console.log("Forwarding to Zapier:", webhookUrl, safePayload);

let zapRes: Response;
try {
  zapRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safePayload),
  });
} catch (e) {
  console.error("Zapier fetch threw error:", e);
  return new Response(
    JSON.stringify({ ok: false, forwarded: false, error: "Zapier fetch failed" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const zapText = await zapRes.text().catch(() => "");
console.log("Zapier response status:", zapRes.status);
if (zapText) console.log("Zapier response body:", zapText);



    return new Response(JSON.stringify({ ok: true, forwarded: true, zapierStatus: zapRes.status }), {

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

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { verifyMessage, isAddress, isHex } from "viem";



export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const address = body?.address as string | undefined;
  const message = body?.message as string | undefined;
  const signature = body?.signature as string | undefined;

  if (!address || !message || !signature || !isAddress(address)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  // Check nonce exists and is fresh
  if (!session.nonce || !session.nonceIssuedAt) {
    return NextResponse.json({ error: "No nonce" }, { status: 401 });
  }
  const ageMs = Date.now() - session.nonceIssuedAt;
  if (ageMs > 10 * 60 * 1000) { // 10 minutes
    return NextResponse.json({ error: "Nonce expired" }, { status: 401 });
  }

  // Ensure the message includes the nonce we issued (prevents replay)
  if (!message.includes(`Nonce: ${session.nonce}`)) {
    return NextResponse.json({ error: "Nonce mismatch" }, { status: 401 });
  }

  if (typeof signature !== "string" || !isHex(signature)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
}

const ok = await verifyMessage({
  address: address as `0x${string}`,
  message,
  signature: signature as `0x${string}`,
});


  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Mark session authenticated
  session.address = address as `0x${string}`;
  session.nonce = undefined;
  session.nonceIssuedAt = undefined;
  await session.save();

  return res;
}

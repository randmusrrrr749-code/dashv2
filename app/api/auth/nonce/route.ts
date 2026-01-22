import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { isAddress } from "viem";

function randomNonce(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") ?? "";

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const session = await getIronSession<SessionData>(req, NextResponse.next(), sessionOptions);

  const nonce = randomNonce(20);
  session.nonce = nonce;
  session.nonceIssuedAt = Date.now();
  await session.save();

  const domain = req.headers.get("host") ?? "weewux.com";
  const message =
`Sign in to ${domain}
Wallet: ${address}
Nonce: ${nonce}
IssuedAt: ${new Date().toISOString()}`;

  return NextResponse.json({ nonce, message });
}

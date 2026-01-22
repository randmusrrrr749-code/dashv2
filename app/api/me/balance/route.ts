import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

// TODO: replace with your real storage query
type PurchaseRow = { omixAmount?: number; estimatedUsdCost?: number; timestamp?: string; status?: string };

async function getPurchasesForWallet(address: `0x${string}`): Promise<PurchaseRow[]> {
  return [];
}


export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.address) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await getPurchasesForWallet(session.address);

const totalPurchased = rows.reduce((acc, r) => acc + (r.omixAmount ?? 0), 0);




  // Later you can add: vested/claimable/distributed
  return NextResponse.json({
    address: session.address,
    totalPurchased,
    purchases: rows,
  });
}

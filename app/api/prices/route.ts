import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Simple in-memory cache (per server instance)
let cache: { ts: number; data: any } | null = null;

const CACHE_TTL_MS = 30_000; // 30s

export async function GET() {
  try {
    const API_KEY = process.env.COINGECKO_API_KEY; // <-- set this in .env (NOT NEXT_PUBLIC)
    if (!API_KEY) {
      return NextResponse.json(
        { error: "COINGECKO_API_KEY not set" },
        { status: 500 }
      );
    }

    // serve cached response if still fresh
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const ids = "ethereum,usd-coin,tether,bitcoin,solana,ripple";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      ids
    )}&vs_currencies=usd`;

    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-cg-demo-api-key": API_KEY,
        "User-Agent": "weewux-presale/1.0",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "CoinGecko request failed",
          http: upstream.status,
          body: text?.slice(0, 500) || null,
        },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    // basic validation (similar to your PHP JSON check)
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON from CoinGecko" },
        { status: 502 }
      );
    }

    // update cache
    cache = { ts: now, data };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal error", message: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

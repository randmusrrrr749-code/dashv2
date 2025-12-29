// app/api/address-config/route.ts
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_ADDRESS_CONFIG_URL;

    if (!url) {
      console.error("NEXT_PUBLIC_ADDRESS_CONFIG_URL not set");
      return new Response("Config URL not set", { status: 500 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to fetch address config CSV:", res.status);
      return new Response("Failed to fetch config", { status: 500 });
    }

    const csv = await res.text();

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error in /api/address-config:", err);
    return new Response("Internal error", { status: 500 });
  }
}

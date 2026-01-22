import { NextRequest, NextResponse } from "next/server";

type Row = Record<string, string>;

function parseCsv(csv: string): Row[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    const next = csv[i + 1];

    if (c === '"' && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
if ((c === "\n" || c === "\r") && !inQuotes) {
  // handle \r\n (Windows) and \n (Unix)
  if (c === "\r" && next === "\n") {
    i++; // skip the \n
  }
  lines.push(cur);
  cur = "";
  continue;
}
cur += c;

  }
  if (cur) lines.push(cur);

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cell = "";
    let q = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const nx = line[i + 1];

      if (ch === '"' && nx === '"') {
        cell += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        out.push(cell);
        cell = "";
        continue;
      }
      cell += ch;
    }
    out.push(cell);
    return out.map((s) => s.trim());
  };

  const header = splitLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.every((c) => c === "")) continue;

    const row: Row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j] ?? "";
    rows.push(row);
  }

  return rows;
}

function asNumber(x: unknown) {
  const n = Number(String(x ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("address") ?? "").trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const address = raw.toLowerCase();

  const url = process.env.SHEET_PURCHASES_CSV_URL;
  if (!url) {
    return NextResponse.json({ error: "Missing SHEET_PURCHASES_CSV_URL" }, { status: 500 });
  }

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "Failed to load sheet" }, { status: 502 });
  }

  const csv = await r.text();
  const rows = parseCsv(csv);

  // Primary ownership: receiveAddress (recommended)
  // Also match userWallet for convenience.
  const matches = rows.filter((row) => {
    const receive = (row["receiveaddress"] ?? "").toLowerCase();
    const userWallet = (row["userwallet"] ?? "").toLowerCase();
    return receive === address || userWallet === address;
  });

  let confirmedTotal = 0;
  let pendingTotal = 0;

  for (const row of matches) {
    const amt = asNumber(row["omixamount"]);
    const status = String(row["status"] ?? "").trim().toLowerCase();

    if (status === "confirmed") confirmedTotal += amt;
    if (status === "pending") pendingTotal += amt;
  }

  return NextResponse.json({
    address,
    confirmedTotal,
    pendingTotal,
    // optional: show a short history list
    purchases: matches
      .map((r) => ({
        timestamp: r["timestamp"] ?? "",
        status: (r["status"] ?? "").trim(),
        paymentMode: r["paymentmode"] ?? "",
        method: r["method"] ?? "",
        omixAmount: asNumber(r["omixamount"]),
        estimatedUsdCost: asNumber(r["estimatedusdcost"]),
        txHash: r["txhash"] ?? "",
      }))
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 50),
  });
}

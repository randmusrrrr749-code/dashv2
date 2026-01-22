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

  const url = process.env.SHEET_STAKES_CSV_URL;
  if (!url) {
    return NextResponse.json(
      { error: "Missing SHEET_STAKES_CSV_URL" },
      { status: 500 }
    );
  }

  const bust = `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
const r = await fetch(bust, { cache: "no-store" });

  if (!r.ok) {
    return NextResponse.json({ error: "Failed to load sheet" }, { status: 502 });
  }

  const csv = await r.text();
  const rows = parseCsv(csv);

  // Match wallet column
  const matches = rows.filter((row) => {
    const w = (row["wallet"] ?? "").toLowerCase();
    return w === address;
  });

  // Stakes list
  const stakes = matches
    .map((row) => {
      const status = String(row["status"] ?? "active").trim().toLowerCase();
      const amount = asNumber(row["amount"]);
      const lockSeconds = asNumber(row["lockseconds"]);
      const apr = asNumber(row["apr"]);
      const startTime = asNumber(row["starttime"]);
      const endTime = asNumber(row["endtime"]);

      return {
        id: row["id"] || row["attempt"] || row["timestamp"] || "",
        status: status === "closed" ? "closed" : status === "cancelled" ? "cancelled" : "active",
        amount,
        lockSeconds,
        apr,
        startTime,
        endTime,
      };
    })
    .sort((a, b) => (a.startTime < b.startTime ? 1 : -1))
    .slice(0, 100);

  // Totals
  let totalStaked = 0;
  let activeStaked = 0;

  for (const s of stakes) {
    totalStaked += s.amount;
    if (s.status === "active") activeStaked += s.amount;
  }

  // Simple estimated earnings (optional)
  // For locked: assume full reward = amount * apr% when finished
  // For flex: accrue linearly by time
  const nowSec = Math.floor(Date.now() / 1000);
  let earnedEstimated = 0;

  for (const s of stakes) {
    if (s.status !== "active") continue;
    if (!s.amount || !s.apr) continue;

    const rate = s.apr / 100;

    if (!s.lockSeconds || s.endTime === 0) {
      // flex estimate: APR * time
      const seconds = Math.max(0, nowSec - (s.startTime || nowSec));
      const years = seconds / (365 * 24 * 60 * 60);
      earnedEstimated += s.amount * rate * years;
    } else {
      // locked estimate: linear progress toward final reward
      const start = s.startTime || nowSec;
      const end = s.endTime || start + s.lockSeconds;
      const lockTotal = Math.max(1, end - start);
      const elapsed = Math.max(0, Math.min(lockTotal, nowSec - start));
      const progress = elapsed / lockTotal;

      const finalReward = s.amount * rate;
      earnedEstimated += finalReward * progress;
    }
  }

  return NextResponse.json({
    address,
    totalStaked,
    activeStaked,
    earnedEstimated,
    stakes,
  });
}

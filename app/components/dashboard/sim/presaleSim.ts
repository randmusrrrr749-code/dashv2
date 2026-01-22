export type SimTx = {
  id: string;
  kind: "PresaleBuy";
  usd: number;
  address: string; // shortened
  ts: number; // ms
};

export type DailyTopBuyer = {
  rank: number;
  address: string;
  usd: number;
  omix: number;
};

const OMIX_PRICE = 0.0175;

const MIN_BUY_USD = 250;

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function getUTCDaySeedFromDayIndex(simStartMs: number, dayIndex1: number) {
  // Convert dayIndex -> actual date -> YYYYMMDD seed
  const dayMs = simStartMs + (dayIndex1 - 1) * 24 * 60 * 60 * 1000;
  const d = new Date(dayMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // keep same as your leaderboard (0-based)
  const day = d.getUTCDate();
  return y * 10000 + m * 100 + day;
}

function generateAddress(seed: number, offset: number): string {
  const rng = seededRandom(seed * 7919 + offset * 104729);

  // 7% BTC bech32, 5% BTC legacy, 2% XRP, rest EVM
  const roll = rng();

  // alphabets
  const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const hex = "0123456789abcdef";

  const randomFrom = (alphabet: string, len: number) => {
    let out = "";
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(rng() * alphabet.length)];
    return out;
  };

  // BTC bech32: bc1 + 25..39 chars
  if (roll < 0.07) {
    return `bc1${randomFrom(BECH32, 30)}`;
  }

  // BTC legacy: 1 + 25..34 chars
  if (roll < 0.07 + 0.05) {
    return `1${randomFrom(BASE58, 33)}`;
  }

  // XRP: r + 24..33 chars
  if (roll < 0.07 + 0.05 + 0.02) {
    return `r${randomFrom(BASE58, 32)}`;
  }

  // EVM: 0x + 40 hex chars (shortened nicer)
  let full = "0x";
  for (let i = 0; i < 40; i++) full += hex[Math.floor(rng() * 16)];

  // less “same-y” look than 0x12f4...9AfE
  return `${full.slice(0, 6)}…${full.slice(-6)}`;
}


// same growth model as before (0.1% - 0.3%)
export function getDailyGrowthRate(dayIndex1: number): number {
  const rng = seededRandom(dayIndex1 * 31337);
  return 0.001 + rng() * 0.002;
}

// Generate the 3 “big buys” for the day (these become daily leaderboard)
function genTop3(daySeed: number): { address: string; usd: number }[] {
  const rng = seededRandom(daySeed);

  // same tiers you used before
  const tierRoll = rng();
  let first: number;
  if (tierRoll < 0.8) first = Math.floor(4000 + rng() * 2000);
  else if (tierRoll < 0.9) first = Math.floor(6001 + rng() * 1519);
  else first = Math.floor(7521 + rng() * 1479);

  const second = Math.floor(first * (1 - (0.10 + rng() * 0.20)));
  const third = Math.floor(first * (1 - (0.10 + rng() * 0.20)));

  return [
    { address: generateAddress(daySeed, 1), usd: first },
    { address: generateAddress(daySeed, 2), usd: second },
    { address: generateAddress(daySeed, 3), usd: third },
  ].sort((a, b) => b.usd - a.usd);
}

// Fill rest of daily target with smaller random buys
function genFillBuys(dayIndex1: number, daySeed: number, remainingUsd: number) {
  const rng = seededRandom(daySeed * 7777 + dayIndex1 * 17);

  const out: { address: string; usd: number }[] = [];
  let i = 10;

while (remainingUsd >= MIN_BUY_USD) {
  const roll = rng();

  let amt: number;

  // 70%: $250 - $1000 (most common)
  if (roll < 0.70) {
    amt = 250 + Math.floor(rng() * (1000 - 250 + 1));
  }
  // 25%: $1000 - $2500 (less common)
  else if (roll < 0.95) {
    amt = 1000 + Math.floor(rng() * (2500 - 1000 + 1));
  }
  // 4.9%: $2500 - $4500 (rare)
  else if (roll < 0.999) {
    amt = 2500 + Math.floor(rng() * (4500 - 2500 + 1));
  }
  // 0.1%: $10k+ anomaly
  else {
    amt = 10_000 + Math.floor(rng() * 15_000); // 10k - 25k
  }

  // Don’t exceed remaining; avoid tiny “last tx” under MIN_BUY_USD
  amt = Math.min(amt, Math.floor(remainingUsd));
  if (amt < MIN_BUY_USD) break;

  out.push({
    address: generateAddress(daySeed, i++),
    usd: amt,
  });

  remainingUsd -= amt;
}


  return out;
}

// Spread tx timestamps across the day in a deterministic but “human” way
function assignTimesForDay(dayStartMs: number, daySeed: number, n: number) {
  const rng = seededRandom(daySeed * 99991);
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const times: number[] = [];
  let t = dayStartMs + Math.floor(rng() * 60 * 60 * 1000); // start within first hour

  for (let i = 0; i < n; i++) {
    // gap: 15–90 minutes
    const gapMin = 15;
    const gapMax = 90;
    const gapMinutes = gapMin + Math.floor(rng() * (gapMax - gapMin + 1));
    t += gapMinutes * 60 * 1000;

    if (t >= dayEndMs) {
      // clamp near end of day (keep deterministic)
      t = dayEndMs - 1_000 - Math.floor(rng() * 30 * 60 * 1000); // within last ~30min
    }

    times.push(t);
  }

  times.sort((a, b) => a - b);
  return times;
}


// Build the full day plan: top3 + fills, sum equals dailyTargetUsd (or very close)
export function buildDayTransactions(opts: {
  simStartMs: number;
  dayIndex1: number;
  dayStartRaisedUsd: number;
}) {
  const { simStartMs, dayIndex1, dayStartRaisedUsd } = opts;

  const daySeed = getUTCDaySeedFromDayIndex(simStartMs, dayIndex1);

  const growth = getDailyGrowthRate(dayIndex1);
  const dailyTarget = Math.floor(dayStartRaisedUsd * growth);

  const top3 = genTop3(daySeed);
  const top3Sum = top3.reduce((s, x) => s + x.usd, 0);

  let remaining = Math.max(0, dailyTarget - top3Sum);
  const fills = genFillBuys(dayIndex1, daySeed, remaining);

  const all = [...top3, ...fills];
  const dayStartMs = simStartMs + (dayIndex1 - 1) * 24 * 60 * 60 * 1000;

  const times = assignTimesForDay(dayStartMs, daySeed, all.length);

  const txs: SimTx[] = all.map((b, i) => ({
    id: `${dayIndex1}-${i}-${b.address}`,
    kind: "PresaleBuy",
    usd: b.usd,
    address: b.address,
    ts: times[i],
  }));

  // recompute actual sum (should be close to target)
  const actualDaily = txs.reduce((s, t) => s + t.usd, 0);

  const dailyTopBuyers: DailyTopBuyer[] = [...top3]
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 3)
    .map((b, idx) => ({
      rank: idx + 1,
      address: b.address,
      usd: b.usd,
      omix: Math.floor(b.usd / OMIX_PRICE),
    }));

  return {
    daySeed,
    dailyTargetUsd: dailyTarget,
    actualDailyUsd: actualDaily,
    dailyTopBuyers,
    txs: txs.sort((a, b) => a.ts - b.ts),
  };
}

// Main function: generate totals and latest txs “as of now”
export function getPresaleSimState(opts: {
  nowMs: number;
  simStartMs: number;
  baseTotalRaisedUsd: number;
  baseTotalBuyers: number;
  maxDays?: number;
  latestN?: number;
}) {
  const {
    nowMs,
    simStartMs,
    baseTotalRaisedUsd,
    baseTotalBuyers,
    maxDays = 45,
    latestN = 6,
  } = opts;

  const elapsedMs = Math.max(0, nowMs - simStartMs);
  const elapsedDaysFloat = elapsedMs / (24 * 60 * 60 * 1000);
  const wholeDays = Math.floor(elapsedDaysFloat);
  const dayProgress01 = elapsedDaysFloat - wholeDays;

  // Build transactions day-by-day
  let runningRaised = baseTotalRaisedUsd;
  let runningBuyers = baseTotalBuyers;

  const allTx: SimTx[] = [];
  let todaysTop: DailyTopBuyer[] = [];

  const daysToBuild = Math.min(maxDays, wholeDays + 1);

  for (let day = 1; day <= daysToBuild; day++) {
    const plan = buildDayTransactions({
      simStartMs,
      dayIndex1: day,
      dayStartRaisedUsd: runningRaised,
    });

    // If today (partial), only include txs with ts <= nowMs
  const isToday = day === wholeDays + 1;

let txsForNow = plan.txs;

if (isToday && txsForNow.length) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const dayStartMs = simStartMs + (day - 1) * DAY_MS;
  const dayEndMs = dayStartMs + DAY_MS - 1;

  // Deterministic lag: 15–90 minutes behind "now"
  const rng = seededRandom(plan.daySeed * 4241);
  const lagMin = 15 + Math.floor(rng() * 76); // 15..90
  const targetLast = Math.max(dayStartMs, Math.min(dayEndMs, nowMs - lagMin * 60_000));

  const lastPlanned = txsForNow[txsForNow.length - 1].ts;
  const shift = targetLast - lastPlanned;

  // Shift today's schedule so it "ends near now"
  txsForNow = txsForNow.map((t) => ({
    ...t,
    ts: Math.max(dayStartMs, Math.min(dayEndMs, t.ts + shift)),
  }));

  // Keep order after shift
  txsForNow.sort((a, b) => a.ts - b.ts);

  // Only show what has "happened" so far today
  txsForNow = txsForNow.filter((t) => t.ts <= nowMs);
} else if (isToday) {
  txsForNow = txsForNow.filter((t) => t.ts <= nowMs);
}


    allTx.push(...txsForNow);

    // buyers count = number of txs (simple but consistent)
    runningBuyers += txsForNow.length;

    // raised = sum of included txs
    const added = txsForNow.reduce((s, t) => s + t.usd, 0);
    runningRaised += added;

    if (isToday) todaysTop = plan.dailyTopBuyers;
  }

  const latestTxs = [...allTx].sort((a, b) => b.ts - a.ts).slice(0, latestN);

  return {
    totalRaisedUsdNow: Math.floor(runningRaised),
    totalBuyersNow: Math.floor(runningBuyers),
    latestTxs,
    todaysTopBuyers: todaysTop,
    dayProgress01,
  };
}

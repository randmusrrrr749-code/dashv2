"use client";

import React, { useMemo, useState } from "react";
import type { DailyTopBuyer } from "./sim/presaleSim";



type LeaderboardEntry = {
  rank: number;
  address: string;
  usd: number;
  omix: number;
  isYou?: boolean;
};

const OMIX_PRICE = 0.017;

const overallTopBuyers: LeaderboardEntry[] = [
  { rank: 1, address: "0x12f4...9AfE", usd: 48_551, omix: Math.floor(48_551 / OMIX_PRICE) },
  { rank: 2, address: "0x98F1...21cD", usd: 47_247, omix: Math.floor(47_247 / OMIX_PRICE) },
  { rank: 3, address: "0xAA77...B4e2", usd: 36_819, omix: Math.floor(36_819 / OMIX_PRICE) },
  { rank: 4, address: "0x0F1f...0F0F", usd: 34_342, omix: Math.floor(34_342 / OMIX_PRICE) },
  { rank: 5, address: "0x552B...Ba1F", usd: 29_876, omix: Math.floor(29_876 / OMIX_PRICE) },
];

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function getUTCDaySeed(): number {
  const now = new Date();
  return now.getUTCFullYear() * 10000 + now.getUTCMonth() * 100 + now.getUTCDate();
}

function generateAddress(baseSeed: number, offset: number): string {
  const rng = seededRandom(baseSeed * 7919 + offset * 104729);
  const hexChars = "0123456789abcdef";
  let fullAddress = "0x";
  for (let i = 0; i < 40; i++) fullAddress += hexChars[Math.floor(rng() * 16)];
  return `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}`;
}

function generateDailyTopBuyers(): LeaderboardEntry[] {
  const daySeed = getUTCDaySeed();
  const rng = seededRandom(daySeed);

  const tierRoll = rng();
  let firstPlaceUSD: number;
  if (tierRoll < 0.8) firstPlaceUSD = Math.floor(4000 + rng() * 2000);
  else if (tierRoll < 0.9) firstPlaceUSD = Math.floor(6001 + rng() * 1519);
  else firstPlaceUSD = Math.floor(7521 + rng() * 1479);

  const secondReduction = 0.1 + rng() * 0.2;
  const thirdReduction = 0.1 + rng() * 0.2;

  const secondPlaceUSD = Math.floor(firstPlaceUSD * (1 - secondReduction));
  const thirdPlaceUSD = Math.floor(firstPlaceUSD * (1 - thirdReduction));

  const address1 = generateAddress(daySeed, 1);
  const address2 = generateAddress(daySeed, 2);
  const address3 = generateAddress(daySeed, 3);

  const entries: LeaderboardEntry[] = [
    { rank: 1, address: address1, usd: firstPlaceUSD, omix: Math.floor(firstPlaceUSD / OMIX_PRICE) },
    { rank: 2, address: address2, usd: secondPlaceUSD, omix: Math.floor(secondPlaceUSD / OMIX_PRICE) },
    { rank: 3, address: address3, usd: thirdPlaceUSD, omix: Math.floor(thirdPlaceUSD / OMIX_PRICE) },
  ];

  entries.sort((a, b) => b.usd - a.usd);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[16px] leading-none">🥇</span>;
  if (rank === 2) return <span className="text-[16px] leading-none">🥈</span>;
  if (rank === 3) return <span className="text-[16px] leading-none">🥉</span>;
  return <span className="text-[10px] tabular-nums text-gray-500">{rank}</span>;

}

export default function LeaderboardCard({
  variant = "compact",
  topN = 5,
  todaysTopBuyers = [],
}: {
  variant?: "default" | "compact";
  topN?: number;
  todaysTopBuyers?: DailyTopBuyer[];
}) {

  const [mode, setMode] = useState<"overall" | "daily">("overall");
  

  const dailyTopBuyers: LeaderboardEntry[] = useMemo(() => {
    const src = (todaysTopBuyers ?? []).slice(0, Math.max(3, topN));

    // fallback if empty
    if (src.length === 0) return generateDailyTopBuyers().slice(0, Math.max(3, topN));

    return src.map((r) => ({
      rank: r.rank,
      address: r.address,
      usd: r.usd,
      omix: r.omix,
    }));
  }, [todaysTopBuyers, topN]);

  const leaderboardData = mode === "overall" ? overallTopBuyers : dailyTopBuyers;
  const rows = leaderboardData.slice(0, topN);



  

  

  return (

    <section className="neon-card neon-card--soft p-4 md:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-white">
  Top Buyers
</h2>
<p className="text-[11px] text-gray-400">
  Ranked by total USD contributed
</p>

        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-black/40 border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setMode("overall")}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-200 ${
                mode === "overall"
                  ? "bg-lime-400/20 border border-lime-400/60 text-lime-300 shadow-[0_0_8px_rgba(163,230,53,0.3)]"
                  : "border border-transparent text-gray-500 hover:text-gray-400"
              }`}
            >
              Overall
            </button>
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-200 ${
                mode === "daily"
                  ? "bg-lime-400/20 border border-lime-400/60 text-lime-300 shadow-[0_0_8px_rgba(163,230,53,0.3)]"
                  : "border border-transparent text-gray-500 hover:text-gray-400"
              }`}
            >
              Daily
            </button>
          </div>

       
        </div>
      </div>

      {mode === "daily" && (
        <div className="flex justify-end mb-2">
          <span className="text-[9px] text-gray-500 italic">Resets daily (UTC)</span>
        </div>
      )}

      {/* Compact widget view */}
      {variant === "compact" ? (
        <div className="mt-2 text-xs text-gray-400">
<div className="grid grid-cols-[2.25rem,1fr,8rem] gap-3 pb-2 items-end text-[10px] text-gray-500">
  <span className="leading-none">#</span>
  <span className="leading-none">Wallet</span>
  <span className="text-right leading-none">USD</span>
</div>
<div className="h-px bg-white/10 mt-2" />


          <div className="mt-2 space-y-2">

            {rows.map((entry) => (
              <div
                key={`${mode}-${entry.rank}`}
                className="grid grid-cols-[2.25rem,1fr,8rem] gap-3 items-center px-3 py-2.5 rounded-xl
  border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition"

                title={`OMIX: ${entry.omix.toLocaleString()}`}
              >
                <div className="flex items-center gap-1.5 leading-none">
                  <RankBadge rank={entry.rank} />
                </div>

                <span className="font-mono text-[11px] text-gray-200">
                  {entry.address}
                </span>

                <span className="text-right tabular-nums">
                  <span className="text-gray-100">${entry.usd.toLocaleString()}</span>
                  <span className="block text-[10px] text-gray-500">
                    {entry.omix.toLocaleString()} OMIX
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Default view (you can keep your old 4-column table here if you want)
        <div className="mt-2 text-xs text-gray-400">
          <div className="grid grid-cols-[2.25rem,1fr,7.5rem,9.5rem] gap-3 pb-2 border-b border-white/10 items-end text-gray-300/90">
            <span className="text-gray-500 leading-none">#</span>
            <span className="leading-none">Wallet</span>
            <span className="text-right leading-none">USD</span>
            <span className="text-right leading-none">OMIX</span>
          </div>

          <div className="divide-y divide-white/5">
            {rows.map((entry) => (
              <div
                key={`${mode}-${entry.rank}`}
                className="grid grid-cols-[2.25rem,1fr,7.5rem,9.5rem] gap-3 items-center py-2 rounded-md
                  hover:bg-white/5 hover:translate-x-[1px] transition"
              >
                <div className="flex items-center gap-1.5 leading-none">
                  <RankBadge rank={entry.rank} />
                </div>

                <span className="font-mono text-[11px] text-gray-200">
                  {entry.address}
                </span>

                <span className="text-right text-gray-100 tabular-nums">
                  ${entry.usd.toLocaleString()}
                </span>

                <span className="text-right text-lime-300 tabular-nums">
                  {entry.omix.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

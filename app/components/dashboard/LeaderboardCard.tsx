"use client";

import React from "react";

type LeaderboardEntry = {
  rank: number;
  address: string;
  usd: number;
  omix: number;
  isYou?: boolean;
};

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    address: "0x12f4...9AfE",
    usd: 231_000,
    omix: 13_588_235,
  },
  {
    rank: 2,
    address: "0x98F1...21cD",
    usd: 162_500,
    omix: 9_027_777,
  },
  {
    rank: 3,
    address: "0xAA77...B4e2",
    usd: 118_200,
    omix: 7_163_636,
  },
  {
    rank: 4,
    address: "0x0F1f...0F0F",
    usd: 84_750,
    omix: 4_460_526,
  },
  {
    rank: 5,
    address: "0x552B...Ba1F",
    usd: 62_300,
    omix: 4_019_354,
  },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[16px] leading-none">🥇</span>;
  if (rank === 2) return <span className="text-[16px] leading-none">🥈</span>;
  if (rank === 3) return <span className="text-[16px] leading-none">🥉</span>;
  return <span className="tabular-nums text-gray-500">{rank}</span>;
}

export default function LeaderboardCard() {
  return (
    
    <section className="neon-card neon-card--soft p-4 md:p-5">
    
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm md:text-base font-semibold tracking-[0.15em] uppercase text-gray-200">
            Top Buyers
          </h2>
          <p className="text-[10px] text-gray-500">Ranked by total USD contributed</p>
        </div>

        <span className="px-2 py-1 rounded-full text-[10px] bg-lime-400/10 border border-lime-400/40 text-lime-300">
          Live
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {/* Header */}
        <div className="grid grid-cols-[2.25rem,1fr,7.5rem,9.5rem] gap-3 pb-2 border-b border-white/10 items-end text-gray-300/90">
          <span className="text-gray-500 leading-none">#</span>
          <span className="leading-none">Wallet</span>
          <span className="text-right leading-none">USD</span>
          <span className="text-right leading-none">OMIX</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {mockLeaderboard.map((entry) => {
            const whale = entry.rank === 4 || entry.rank === 5;

            return (
              <div
                key={entry.rank}
                className="grid grid-cols-[2.25rem,1fr,7.5rem,9.5rem] gap-3 items-center py-2 rounded-md
                  hover:bg-white/5 hover:translate-x-[1px] transition"
              >
                <div className="flex items-center gap-1.5 leading-none">
                  <RankBadge rank={entry.rank} />
                  {whale && (
                    <span title="Whale buyer" className="text-[14px] leading-none opacity-80">
                      🐋
                    </span>
                  )}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

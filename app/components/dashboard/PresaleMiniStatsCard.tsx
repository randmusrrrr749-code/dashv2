"use client";

import React from "react";

type Tier = { icon: string; label: string } | null;

export default function PresaleMiniStatsCard({
  totalRaisedUsd,
  totalBuyers,
  estimatedRank,
  userTier,
}: {
  totalRaisedUsd: number;
  totalBuyers: number;
  estimatedRank: number | null;
  userTier?: Tier;
}) {
  const rankText = estimatedRank ? `#${estimatedRank.toLocaleString()}` : "—";

  return (
    <section className="neon-card neon-card--soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Presale Stats</h2>
          <p className="text-[11px] text-gray-400">Live presale metrics</p>
        </div>

        <span className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-200">
          Live
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Total Raised */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-gray-500">Total raised</p>
          <p className="mt-1 text-sm font-semibold text-lime-200 tabular-nums">
            ${totalRaisedUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">USD</p>
        </div>

        {/* Buyers */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-gray-500">Buyers</p>
          <p className="mt-1 text-sm font-semibold text-white tabular-nums">
            {totalBuyers.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">wallets</p>
        </div>

        {/* Your Rank */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-gray-500">Your rank</p>

          <p className="mt-1 text-sm font-semibold text-white tabular-nums">
  {rankText}
</p>


        
        </div>

        {/* Tier */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-gray-500">Tier</p>

          <p className="mt-1 text-sm font-semibold text-amber-200">
            {userTier ? (
              <span className="flex items-center gap-2">
                <span className="text-[16px]">{userTier.icon}</span>
                {userTier.label}
              </span>
            ) : (
              "—"
            )}
          </p>

          <p className="mt-1 text-[10px] text-gray-500">
            {userTier ? "Based on spend" : "No tier yet"}
          </p>
        </div>
      </div>
    </section>
  );
}

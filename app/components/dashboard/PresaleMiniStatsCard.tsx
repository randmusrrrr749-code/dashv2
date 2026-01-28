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
          <h2 className="text-base font-semibold text-white">Live presale metrics</h2>
          
        </div>

        
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Total Raised */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm text-gray-500">Total raised</p>
          <p className="mt-1 text-base font-semibold text-pink-200 tabular-nums">
            ${totalRaisedUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">USD</p>
        </div>

        {/* Buyers */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm text-gray-500">Buyers</p>
          <p className="mt-1 text-base font-semibold text-white tabular-nums">
            {totalBuyers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">wallets</p>
        </div>

        {/* Your Rank */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm text-gray-500">Your rank</p>

          <p className="mt-1 text-base font-semibold text-white tabular-nums">
  {rankText}
</p>


        
        </div>

        {/* Tier */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm text-gray-500">Tier</p>

          <p className="mt-1 text-base font-semibold text-amber-200">
            {userTier ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">{userTier.icon}</span>
                {userTier.label}
              </span>
            ) : (
              "—"
            )}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {userTier ? "Based on spend" : "No tier yet"}
          </p>
        </div>
      </div>
    </section>
  );
}

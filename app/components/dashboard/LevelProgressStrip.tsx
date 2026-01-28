"use client";

import React, { useMemo } from "react";

type Tier = { icon: string; label: string } | null;

const LEVELS = [
  { key: "crab", label: "Crab", icon: "🦀", minUsd: 0 },
  { key: "shrimp", label: "Shrimp", icon: "🦐", minUsd: 500 },
  { key: "fish", label: "Fish", icon: "🐠", minUsd: 2000 },
  { key: "dolphin", label: "Dolphin", icon: "🐬", minUsd: 5000 },
  { key: "shark", label: "Shark", icon: "🦈", minUsd: 10000 },
  { key: "whale", label: "Whale", icon: "🐋", minUsd: 15000 },
];

export default function LevelProgressStrip({
  totalBuyers,
  estimatedRank,
  userTier,
  usdSpent,
  isConnected,
}: {
  totalBuyers: number;
  estimatedRank: number | null;
  userTier: Tier;
  usdSpent: number;
  isConnected: boolean;
}) {
 const usd = Number.isFinite(usdSpent) ? usdSpent : 0;



  const { currentIdx, nextIdx, progress01, nextNeededUsd } = useMemo(() => {
    if (!isConnected) {
      return {
        currentIdx: 0,
        nextIdx: 1,
        progress01: 0,
        nextNeededUsd: LEVELS[1].minUsd,
      };
    }

    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (usd >= LEVELS[i].minUsd) idx = i;
    }

    const next = Math.min(LEVELS.length - 1, idx + 1);
    const curMin = LEVELS[idx].minUsd;
    const nextMin = LEVELS[next].minUsd;

    const denom = Math.max(1, nextMin - curMin);
    const p =
      idx === next ? 1 : Math.min(1, Math.max(0, (usd - curMin) / denom));
    const needed = Math.max(0, nextMin - usd);

    return { currentIdx: idx, nextIdx: next, progress01: p, nextNeededUsd: needed };
  }, [usd, isConnected]);

  const current = LEVELS[currentIdx];
  const next = LEVELS[nextIdx];

  const leftTitle = estimatedRank
    ? `${current.label} `
    : `${current.label} • Connect & buy to rank`;

  const rightTitle =
    currentIdx === nextIdx
      ? "Max level reached"
      : `Next: ${next.label} • Need $${Math.ceil(nextNeededUsd).toLocaleString()}`;

  return (
    <div className="neon-card neon-card--soft px-4 py-3">
      {/* Top line (single-row on desktop, stacks on mobile) */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" title={current.label}>
            {current.icon}
          </span>

          <p className="text-sm text-gray-200 font-medium truncate">
            {leftTitle}
          </p>
        </div>

        <p className="text-sm text-gray-400 sm:text-right">
          {currentIdx === nextIdx ? (
            <span className="text-gray-300">{rightTitle}</span>
          ) : (
            <>
              <span className="text-gray-300">
                {next.icon} {rightTitle}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-cyan-400"
            style={{ width: `${Math.round(progress01 * 100)}%` }}
          />
        </div>

        {/* End labels (subtle) */}
        
      </div>
    </div>
  );
}

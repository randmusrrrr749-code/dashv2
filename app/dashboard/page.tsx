// app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import DashboardLayout from "../components/layout/DashboardLayout";
import WalletOverview from "../components/dashboard/WalletOverview";
import LevelProgressStrip from "../components/dashboard/LevelProgressStrip";
import PresaleStatusCard from "../components/dashboard/PresaleStatusCard";
import PresaleMiniStatsCard from "../components/dashboard/PresaleMiniStatsCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import LatestTransactionsCard from "../components/dashboard/LatestTransactionsCard";
import ReferralCard from "../components/dashboard/ReferralCard";

import { useOffchainDashboard } from "../components/dashboard/hooks/useOffchainDashboard";
import { getPresaleSimState } from "../components/dashboard/sim/presaleSim";
import { PROMO } from "@/promo.config";

// Simulation start: Jan 11, 2026
const SIM_START = new Date("2026-01-11T00:00:00Z").getTime();

// Your baseline (same as before)
const BASE_TOTAL_RAISED = 10_865_884;
const BASE_TOTAL_BUYERS = 5677;

function getBuyerTierIcon(
  usdSpent: number
): { icon: string; label: string } | null {
  if (usdSpent >= 15000) return { icon: "🐋", label: "Whale" };
  if (usdSpent >= 10000) return { icon: "🦈", label: "Shark" };
  if (usdSpent >= 5000) return { icon: "🐬", label: "Dolphin" };
  if (usdSpent >= 3000) return { icon: "🐟", label: "Big Fish" };
  if (usdSpent >= 2000) return { icon: "🐠", label: "Fish" };
  if (usdSpent >= 1000) return { icon: "🐡", label: "Small Fish" };
  if (usdSpent >= 500) return { icon: "🦐", label: "Shrimp" };
  if (usdSpent > 0) return { icon: "🦀", label: "Crab" };
  return null;
}

export default function DashboardOverviewPage() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Promo visibility
  const promo = PROMO;
  const promoEndsAtMs = promo?.endsAt ? Date.parse(promo.endsAt) : NaN;
  const promoNotExpired =
    !promo?.endsAt || Number.isNaN(promoEndsAtMs) || Date.now() < promoEndsAtMs;
  const promoVisible = !!promo?.enabled && promoNotExpired;

  // Presale simulation (single source of truth for totals + tx bumps + daily top buyers)
  const sim = useMemo(() => {
    return getPresaleSimState({
      nowMs: now,
      simStartMs: SIM_START,
      baseTotalRaisedUsd: BASE_TOTAL_RAISED,
      baseTotalBuyers: BASE_TOTAL_BUYERS,
      latestN: 6, // tweak if you want more/less “latest”
    });
  }, [now]);

  const totalRaised = sim.totalRaisedUsdNow;
  const totalBuyers = sim.totalBuyersNow;

  // Wallet
  const { address, isConnected } = useAccount();

  const { purchasedBlv } = useOffchainDashboard(address, isConnected);

  // Rank / tier (based on spend)
  const ASSUMED_BLV_PRICE = 0.0175;
  const AVG_BUY_USD = 2000;

  const userUsdSpent = useMemo(
    () => purchasedBlv * ASSUMED_BLV_PRICE,
    [purchasedBlv]
  );

  const userTier = useMemo(() => {
    if (!isConnected || !address || purchasedBlv <= 0) return null;
    return getBuyerTierIcon(userUsdSpent);
  }, [isConnected, address, purchasedBlv, userUsdSpent]);

  const estimatedRank = useMemo(() => {
    if (!isConnected || !address || purchasedBlv <= 0) return null;

    const relative = userUsdSpent / AVG_BUY_USD;
    const percentile = 1 / (1 + Math.max(0.0001, relative));
    const rank = Math.round(totalBuyers * percentile);

    return Math.min(totalBuyers, Math.max(1, rank));
  }, [isConnected, address, purchasedBlv, userUsdSpent, totalBuyers]);

  return (
    <DashboardLayout>
      {/* ROW 1 */}
      <section className="grid gap-4 lg:grid-cols-3 mb-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <WalletOverview />

          {/* Desktop strip */}
          <div className="hidden lg:block">
<LevelProgressStrip
  totalBuyers={totalBuyers}
  estimatedRank={estimatedRank}
  userTier={userTier}
  usdSpent={userUsdSpent}
  isConnected={isConnected}
/>


          </div>
        </div>

        {/* Right */}
        <div className="neon-card neon-card--soft p-4 text-sm text-gray-300">
          <PresaleStatusCard promoVisible={promoVisible} promo={promo} />

          <div className="mt-4">
            <PresaleMiniStatsCard
              totalRaisedUsd={totalRaised}
              totalBuyers={totalBuyers}
              estimatedRank={estimatedRank}
              userTier={userTier}
            />
          </div>
        </div>
      </section>

      {/* Mobile strip */}
      <section className="mb-6 lg:hidden">
        <LevelProgressStrip
          totalBuyers={totalBuyers}
          estimatedRank={estimatedRank}
          userTier={userTier}
          usdSpent={userUsdSpent}
          isConnected={isConnected}
        />
      </section>

      {/* ROW 2 */}
<section className="grid gap-6 lg:grid-cols-2 items-start">
  <div className="min-w-0">
    <LeaderboardCard
      variant="compact"
      topN={5}
      todaysTopBuyers={sim.todaysTopBuyers}
    />
  </div>

  <div className="min-w-0 grid gap-6">
    <LatestTransactionsCard txs={sim.latestTxs} />
    <ReferralCard purchasedBlv={purchasedBlv} isConnected={isConnected} address={address} />
  </div>
</section>

    </DashboardLayout>
  );
}

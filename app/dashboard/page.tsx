"use client";

import DashboardLayout from "../components/layout/DashboardLayout";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import WalletOverview from "../components/dashboard/WalletOverview";
import { motion } from "framer-motion";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import PresaleABI from "../abi/weewuxPresale.json";
import StakingABI from "../abi/omixStaking.json";

import { PROMO } from "@/promo.config";

import { redirect } from "next/navigation";



const STAKING_CONTRACT_ADDRESS =
  "0x6e2d536e07a9cEbeE39cF07Ec7055898c2a65558" as `0x${string}`;

const PRESALE_CONTRACT_ADDRESS =
  "0x4a6dfa7d9880F66E82fF513bcd04F94b1EfD1Aa8" as `0x${string}`;

const OMIX_DECIMALS = 18;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

const BASE_TOTAL_OMIX_SOLD = 7_120_000; // a bit above 7M
const BASE_TOTAL_BUYERS = 4567;

const DAILY_OMIX_GROWTH = 0.002; // +0.2% per day
const DAILY_BUYERS_GROWTH = 10; // +10 buyers per day

// Pick a fixed “simulation start” timestamp (edit to whatever you want)
const SIM_START = new Date("2025-12-18T00:00:00Z").getTime();

export default function DashboardOverviewPage() {
 

  const TOTAL_BUYERS = 4567;

  // used only to trigger re-renders occasionally
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000); // re-render every 30s
    return () => clearInterval(id);
  }, []);

  const elapsedDays = Math.max(0, (now - SIM_START) / (24 * 60 * 60 * 1000));


const promo = PROMO;
const promoEndsAtMs = promo?.endsAt ? Date.parse(promo.endsAt) : NaN;
const promoNotExpired =
  !promo?.endsAt || Number.isNaN(promoEndsAtMs) || Date.now() < promoEndsAtMs;

const promoVisible = !!promo?.enabled && promoNotExpired;





  // OMIX sold grows by +0.2% per day (compounded)
  const totalOmixSold = useMemo(() => {
    return BASE_TOTAL_OMIX_SOLD * Math.pow(1 + DAILY_OMIX_GROWTH, elapsedDays);
  }, [elapsedDays]);

  // Buyers grows by +10 per day (linear)
  const totalBuyers = useMemo(() => {
    return Math.floor(BASE_TOTAL_BUYERS + DAILY_BUYERS_GROWTH * elapsedDays);
  }, [elapsedDays]);

  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as `0x${string}`;

  // user bought OMIX (real on-chain)
  const { data: boughtRaw } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PresaleABI,
    functionName: "buyersAmount",
    args: [userAddress],
  });

  const purchasedOmix = boughtRaw
    ? Number(formatUnits(boughtRaw as bigint, OMIX_DECIMALS))
    : 0;

  // Rank estimation:
  // We want ~$2000 buy (≈ 1 ETH assumed) to land around the middle.
  const AVG_BUY_USD = 2000;
  const ASSUMED_OMIX_PRICE = 0.0175; // between $0.015 and $0.020

  const estimatedRank = useMemo(() => {
    if (!isConnected || !address || purchasedOmix <= 0) return null;

    const userUsd = purchasedOmix * ASSUMED_OMIX_PRICE;
    const relative = userUsd / AVG_BUY_USD; // 1.0 => avg buyer

    // percentile = 1/(1+relative) => relative=1 -> 0.5 (middle)
    const percentile = 1 / (1 + Math.max(0.0001, relative));
    const rank = Math.round(TOTAL_BUYERS * percentile);

    return Math.min(TOTAL_BUYERS, Math.max(1, rank));
  }, [isConnected, address, purchasedOmix]);

  type StakeRow = {
    amount: bigint;
    startTime: bigint;
    endTime: bigint;
    rewardRate: bigint;
    withdrawn: boolean;
  };




  const hasPurchased = purchasedOmix > 0;

const referralCode = useMemo(() => {
  if (!address) return "";
  // you can swap this to whatever format you want later (short hash, etc.)
  return address;
}, [address]);

const referralLink = useMemo(() => {
  if (!address) return "";
  return `https://weewux.com/?ref=${address}`;
}, [address]);


  const toSeconds = (t: bigint | number) => {
    const n = typeof t === "bigint" ? Number(t) : t;
    // if it's bigger than year 2286 in seconds, it's almost certainly milliseconds
    return n > 10_000_000_000 ? Math.floor(n / 1000) : n;
  };

  const { data: stakesRaw } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakingABI,
    functionName: "getUserStakes",
    args: [userAddress],
  });

  const stakes = (stakesRaw ?? []) as StakeRow[];
  const activeStakes = useMemo(() => stakes.filter((s) => !s.withdrawn), [stakes]);

  const totalStakedRaw = useMemo(() => {
    return activeStakes.reduce((acc, s) => acc + (s.amount ?? 0n), 0n);
  }, [activeStakes]);

  const totalStaked = useMemo(() => {
    return Number(formatUnits(totalStakedRaw, OMIX_DECIMALS));
  }, [totalStakedRaw]);

  // Exact lock mapping (matches contract: 0, 30d, 90d, 365d, 730d)
  const apyFromLockSeconds = (lockSeconds: number) => {
    if (lockSeconds === 0) return 8; // flex APR
    if (lockSeconds === 30 * 86400) return 20;
    if (lockSeconds === 90 * 86400) return 40;
    if (lockSeconds === 365 * 86400) return 65;
    if (lockSeconds === 730 * 86400) return 95;
    // fallback (shouldn't happen) - snap by nearest
    const opts = [0, 30, 90, 365, 730].map((d) => d * 86400);
    const closest = opts.reduce((best, v) =>
      Math.abs(v - lockSeconds) < Math.abs(best - lockSeconds) ? v : best
    , opts[0]);
    return apyFromLockSeconds(closest);
  };

  // Weighted APY across active stakes (by amount)
  const estimatedApy = useMemo(() => {
    if (activeStakes.length === 0) return null;

    let total = 0;
    let weighted = 0;

    for (const s of activeStakes) {
      const amt = Number(formatUnits(s.amount, OMIX_DECIMALS));
      if (!amt) continue;

      const start = toSeconds(s.startTime);
      const end = toSeconds(s.endTime);

      // IMPORTANT: contract flex = (endTime == startTime)
      const isFlex = end === start;
      const lockSeconds = isFlex ? 0 : Math.max(0, end - start);

      const apy = apyFromLockSeconds(lockSeconds);

      total += amt;
      weighted += amt * apy;
    }

    if (total === 0) return null;
    return weighted / total;
  }, [activeStakes]);

  const apyBreakdown = useMemo(() => {
    const buckets = new Map<number, number>(); // apy -> amount

    for (const s of activeStakes) {
      const amt = Number(formatUnits(s.amount, OMIX_DECIMALS));
      if (!amt) continue;

      const start = toSeconds(s.startTime);
      const end = toSeconds(s.endTime);

      const isFlex = end === start;
      const lockSeconds = isFlex ? 0 : Math.max(0, end - start);
      const apy = apyFromLockSeconds(lockSeconds);

      buckets.set(apy, (buckets.get(apy) ?? 0) + amt);
    }

    return [...buckets.entries()].sort((a, b) => b[0] - a[0]);
  }, [activeStakes]);

  // Earned live:
  // - flex: prorated APR (8%) by elapsed time
  // - locked: "earned so far" = linear progress toward final fixed reward over lock duration
  const earnedFromStaking = useMemo(() => {
    const nowSec = Math.floor(now / 1000);
    let earned = 0;

    for (const s of activeStakes) {
      const amt = Number(formatUnits(s.amount, OMIX_DECIMALS));
      if (!amt) continue;

      const start = toSeconds(s.startTime);
      const end = toSeconds(s.endTime);

      const isFlex = end === start;

      if (isFlex) {
        const secondsStaked = Math.max(0, nowSec - start);
        const years = secondsStaked / (365 * 24 * 60 * 60);
        earned += amt * (8 / 100) * years;
        continue;
      }

      const lockSeconds = Math.max(1, end - start);

      // snap lockSeconds to known options so APY mapping is stable
      const opts = [30, 90, 365, 730].map((d) => d * 86400);
      const snappedLock = opts.reduce((best, v) =>
        Math.abs(v - lockSeconds) < Math.abs(best - lockSeconds) ? v : best
      , opts[0]);

      const apy = apyFromLockSeconds(snappedLock);

      const secondsElapsed = Math.max(0, Math.min(snappedLock, nowSec - start));
      const progress = secondsElapsed / snappedLock;

      const finalReward = amt * (apy / 100);
      earned += finalReward * progress;
    }

    return earned;
  }, [activeStakes, now]);

  return (
    <DashboardLayout>
      {/* Top row: wallet overview + status */}
      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="md:col-span-2">
          <WalletOverview />
        </div>

        <div className="neon-card neon-card--soft p-4 text-sm text-gray-300">
  <div className="pointer-events-none -mt-4 -mx-4 mb-3">
    <div className="h-[2px] bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.75),transparent)] opacity-70" />
    <div className="h-[10px] bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.18),transparent_70%)] blur-[2px]" />
  </div>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
              Presale Status
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-200">
              Live
            </span>
          </div>

          {/* Primary CTA */}
<a
  href="/dashboard/presale"
  className="group mt-3 flex items-center justify-between rounded-xl border border-lime-400/25
             bg-gradient-to-r from-lime-400/15 via-lime-300/5 to-lime-400/15
             px-3 py-2 text-xs font-semibold text-lime-100
             shadow-[0_0_0_1px_rgba(163,230,53,0.10),0_0_22px_rgba(163,230,53,0.14)]
             hover:bg-lime-400/20 hover:shadow-[0_0_0_1px_rgba(163,230,53,0.14),0_0_30px_rgba(163,230,53,0.20)]
             transition"
>
  <span className="flex items-center gap-2">
    <span className="inline-flex h-2 w-2 rounded-full bg-lime-300/90 shadow-[0_0_14px_rgba(163,230,53,0.45)]" />
    Buy now
    <span className="text-[10px] text-gray-300/80 font-normal">(Presale)</span>
  </span>

  <span className="text-gray-300 group-hover:text-white transition">→</span>
</a>


          <ul className="text-sm">
            {/* separator ABOVE referral */}
            <li className="pt-2 mb-2 border-t border-white/10" />

            <li className="flex items-center justify-between">
              <span className="text-gray-400">Referral bonus</span>

              <a
                href="/dashboard/presale"
                className="relative overflow-hidden text-[12px] px-2 py-1 rounded-full border border-lime-400/30 text-lime-100
             bg-gradient-to-r from-lime-400/15 via-lime-300/5 to-lime-400/15
             shadow-[0_0_0_1px_rgba(163,230,53,0.10),0_0_18px_rgba(163,230,53,0.12)]
             hover:scale-[1.04] hover:bg-lime-400/20 transition cursor-pointer"
              >
                <span
                  className="absolute inset-0 -translate-x-full animate-[shine_2.6s_ease-in-out_infinite]
                   bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
                <span className="relative font-semibold">+30% OMIX</span>
              </a>
            </li>

            {/* existing separator before staking */}
            <li className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-gray-400">Staking</span>

              <a
                href="/dashboard/staking"
                className="relative overflow-hidden text-[12px] px-2 py-1 rounded-full border border-amber-300/40 text-amber-100
             bg-gradient-to-r from-amber-400/25 via-yellow-300/10 to-amber-400/25
             shadow-[0_0_0_1px_rgba(252,211,77,0.10),0_0_22px_rgba(252,211,77,0.16)]
             hover:scale-[1.04] hover:bg-amber-400/30 transition cursor-pointer"
              >
                <span
                  className="absolute inset-0 -translate-x-full animate-[shine_2.2s_ease-in-out_infinite]
                   bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
                <span className="relative font-semibold">
                  Up to <span className="text-white">95%</span>
                </span>
              </a>
            </li>
          </ul>

          
{promoVisible && (

  <div className="mt-3 rounded-xl border border-red-400/20 bg-gradient-to-r from-red-500/10 via-white/5 to-green-500/10 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-300/80">
          {promo.tag}
        </p>

        <p className="text-sm font-semibold text-white">{promo.title}</p>

        <p className="mt-1 text-[11px] text-gray-300">
          {promo.body.slice(0, promo.highlight_from)}
          <span className="text-amber-200 font-semibold">
            {promo.body.slice(promo.highlight_from)}
          </span>
        </p>
      </div>

      <span className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-200">
        {promo.badge}
      </span>
    </div>

    <p className="mt-1 text-[10px] text-gray-400">{promo.endsText}</p>
  </div>
)}

        </div>
      </section>

      {/* Middle row: leaderboard + placeholder for future stats */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
        <LeaderboardCard />

        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold mb-1">Presale Summary</h2>
              <p className="text-xs text-gray-400">
                Ranked by total USD contributed (mock buyers count for now).
              </p>
            </div>

            <span className="px-2 py-1 rounded-full text-[10px] bg-lime-400/10 border border-lime-400/40 text-lime-300">
              Live
            </span>
          </div>

          <ul className="mt-3 text-sm text-gray-300 space-y-2">
            <li className="flex items-center justify-between">
              <span className="text-gray-400">Total buyers</span>
              <span className="text-gray-100 tabular-nums">
                {TOTAL_BUYERS.toLocaleString()}
              </span>
            </li>

            <li className="flex items-center justify-between">
              <span className="text-gray-400">Total OMIX sold</span>
              <span className="text-lime-300 font-medium tabular-nums">
                {Math.floor(totalOmixSold).toLocaleString()}
              </span>
            </li>

            <li className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-gray-400">Your rank</span>
              <span className="text-gray-100 tabular-nums">
                {estimatedRank ? `#${estimatedRank.toLocaleString()}` : "—"}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Bottom row: staking + referral placeholders */}
      
    </DashboardLayout>
  );
}

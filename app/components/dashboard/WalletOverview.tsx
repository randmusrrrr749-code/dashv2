"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import toast from "react-hot-toast";

import ERC20ABI from "../../abi/ERC20.json";
import PresaleABI from "../../abi/weewuxPresale.json";
import StakingABI from "../../abi/omixStaking.json";

const OMIX_TOKEN_ADDRESS =
  "0xb9A091213246Ee02c8BFF4e86D84b0C3536d0631" as `0x${string}`;

const PRESALE_CONTRACT_ADDRESS =
  "0x4a6dfa7d9880F66E82fF513bcd04F94b1EfD1Aa8" as `0x${string}`;

const STAKING_CONTRACT_ADDRESS =
  "0x6e2d536e07a9cEbeE39cF07Ec7055898c2a65558" as `0x${string}`;

const OMIX_DECIMALS = 18;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;


  

function shortenAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDurationSeconds(seconds: number) {
  if (seconds <= 0) return "flex (no lock)";
  const d = Math.floor(seconds / 86400);
  if (d >= 365 && d % 365 === 0) return `${d / 365}y`;
  if (d >= 30 && d % 30 === 0) return `${d / 30}m`;
  return `${d}d`;
}

const toSeconds = (t: bigint | number) => {
  const n = typeof t === "bigint" ? Number(t) : t;
  return n > 10_000_000_000 ? Math.floor(n / 1000) : n;
};


export default function WalletOverview() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as `0x${string}`;

  // --- Presale purchased amount (used for referral unlock) ---
  const { data: boughtRaw } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PresaleABI,
    functionName: "buyersAmount",
    args: [userAddress],
  });

  const purchasedOmix = boughtRaw
    ? Number(formatUnits(boughtRaw as bigint, OMIX_DECIMALS))
    : 0;

  const hasPurchased = purchasedOmix > 0;

  // --- Staking: get all user stakes ---
  type StakeRow = {
    amount: bigint;
    startTime: bigint;
    endTime: bigint;
    rewardRate: bigint;
    withdrawn: boolean;
  };


  

  const { data: stakesRaw } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakingABI,
    functionName: "getUserStakes",
    args: [userAddress],
  });

  const stakes = (stakesRaw ?? []) as StakeRow[];

  // Active stakes only
  const activeStakes = useMemo(
    () => stakes.filter((s) => !s.withdrawn),
    [stakes]
  );

  // Total staked
  const totalStakedRaw = useMemo(() => {
    return activeStakes.reduce((acc, s) => acc + (s.amount ?? 0n), 0n);
  }, [activeStakes]);

  const totalStaked = Number(formatUnits(totalStakedRaw, OMIX_DECIMALS));

  // “Main lock summary” (largest stake by amount)
  const lockSummary = useMemo(() => {
    if (activeStakes.length === 0) return null;

    const biggest = [...activeStakes].sort((a, b) =>
      a.amount > b.amount ? -1 : 1
    )[0];

    const start = Number(biggest.startTime);
    const end = Number(biggest.endTime);
    const now = Math.floor(Date.now() / 1000);

    // flex stakes in your contract have endTime = 0
    if (!end) {
      return {
        label: "Flex (no lock)",
        remaining: "withdraw anytime",
      };
    }

    const totalLock = end - start;
    const remaining = Math.max(0, end - now);

    return {
      label: `Locked for ${formatDurationSeconds(totalLock)}`,
      remaining:
        remaining > 0
          ? `${formatDurationSeconds(remaining)} remaining`
          : "unlocked",
    };
  }, [activeStakes]);


const earnedFromStaking = useMemo(() => {
  const nowSec = Math.floor(Date.now() / 1000);
  let earned = 0;

  for (const s of activeStakes) {
    const amt = Number(formatUnits(s.amount, OMIX_DECIMALS));
    if (!amt) continue;

    const rate = Number(s.rewardRate); // %
    const start = toSeconds(s.startTime);
    const end = toSeconds(s.endTime);

    const isFlex = end === start;

    // FLEX: APR accrues continuously
    if (isFlex) {
      const secondsStaked = Math.max(0, nowSec - start);
      const years = secondsStaked / (365 * 24 * 60 * 60);
      earned += amt * (rate / 100) * years;
      continue;
    }

    // LOCKED: show linear progress toward final reward
    const lockSeconds = Math.max(1, end - start);
    const elapsed = Math.max(0, Math.min(lockSeconds, nowSec - start));
    const progress = elapsed / lockSeconds;

    const finalReward = amt * (rate / 100);
    earned += finalReward * progress;
  }

  return earned;
}, [activeStakes]);


  // 2) referral earned: you said manual for now → keep 0 until you wire tracking
  const earnedFromReferral = 0;

  const totalEarned = earnedFromStaking + earnedFromReferral;

  

  // --- Referral link generation (only after purchase) ---
  const [generatedReferral, setGeneratedReferral] = useState("");

  const handleGenerateReferral = () => {
    if (!address) return toast.error("Connect wallet first.");
    if (!hasPurchased) {
      toast.error("Referral link unlocks after your first purchase.");
      return;
    }
    const link = `https://weewux.com/?ref=${address}`;
    setGeneratedReferral(link);
    toast.success("Referral link generated!");
  };

  const handleCopyReferral = () => {
    if (!generatedReferral) return;
    navigator.clipboard.writeText(generatedReferral);
    toast.success("Referral link copied!");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="neon-card neon-card--hero p-4 md:p-5">

      <div className="pointer-events-none -mt-4 -mx-4 mb-4">
  <div className="h-[2px] bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.75),transparent)] opacity-70" />
  <div className="h-[10px] bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.18),transparent_70%)] blur-[2px]" />
</div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Wallet Overview
          </p>
          <h2 className="text-base md:text-lg font-semibold text-white">
            {isConnected ? "Your OMIX hub" : "Connect your wallet"}
          </h2>
        </div>

        
        <div className="text-right text-[11px] text-gray-400">
          <p>Status:</p>
          <p
            className={
              isConnected ? "text-lime-300 font-medium" : "text-red-300"
            }
          >
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>

      {/* Address + referral link controls */}
      <div className="mb-4">
        <p className="text-[11px] text-gray-400 mb-1">Active wallet</p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-gray-200">
            {isConnected && address
              ? shortenAddress(address)
              : "No wallet connected"}
          </span>
          {isConnected && address && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-[10px] px-2 py-1 rounded-full border border-lime-400/40 text-lime-200 hover:bg-lime-400/10"
            >
              Copy
            </button>
          )}
        </div>

        {/* Referral link (unlocks after purchase) */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">Referral link</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                hasPurchased
                  ? "border-lime-400/30 text-lime-300"
                  : "border-yellow-400/30 text-yellow-300"
              }`}
            >
              {hasPurchased ? "Unlocked" : "Locked"}
            </span>
          </div>

          <div className="mt-2 flex gap-2">
  <input
    readOnly
    value={generatedReferral}
    placeholder={
      hasPurchased
        ? generatedReferral
          ? "Your referral link"
          : "Generate your referral link"
        : "Unlocks after first purchase"
    }
    className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-gray-100"
  />

  <button
    type="button"
    disabled={!hasPurchased}
    onClick={() =>
      generatedReferral ? handleCopyReferral() : handleGenerateReferral()
    }
    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
      hasPurchased
        ? "bg-lime-400 text-black hover:bg-lime-300"
        : "bg-white/10 text-gray-500 cursor-not-allowed"
    }`}
  >
    {generatedReferral ? "Copy" : "Generate"}
  </button>
</div>


          {!hasPurchased && (
            <p className="mt-2 text-[10px] text-gray-500">
              Make at least 1 presale purchase to unlock referrals.
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-xs mt-2">
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">OMIX staked</p>
          <p className="text-sm font-semibold text-lime-300">
            {totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>
          {lockSummary && (
            <p className="mt-1 text-[10px] text-gray-500">
              {lockSummary.label} • {lockSummary.remaining}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">Bought in presale</p>
          <p className="text-sm font-semibold text-purple-300">
            {purchasedOmix.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">OMIX earned</p>
          <p className="text-sm font-semibold text-cyan-300">
            {totalEarned.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            Staking: {earnedFromStaking.toLocaleString(undefined, { maximumFractionDigits: 4 })} •
            Referral: {earnedFromReferral.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

          </motion.section>
  );
}

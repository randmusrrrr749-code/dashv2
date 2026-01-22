"use client";

import React, { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";

type PurchaseRow = {
  timestamp?: string;
  status?: string;
  paymentMode?: string;
  method?: string;
  omixAmount?: number;
  estimatedUsdCost?: number;
  txHash?: string;
};

type OffchainBalanceResp = {
  confirmedTotal: number;
  pendingTotal: number;
  purchases?: PurchaseRow[];
};


type OffchainStakingResp = {
  totalStaked: number;
  activeStaked: number;
  earnedEstimated: number;
};

function shortenAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletOverview() {
  const { address, isConnected } = useAccount();
  const [offchainBalance, setOffchainBalance] = useState<OffchainBalanceResp | null>(null);
  const [offchainStaking, setOffchainStaking] = useState<OffchainStakingResp | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setOffchainBalance(null);
      setOffchainStaking(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const addr = address.toLowerCase();

        const [resBal, resStake] = await Promise.all([
          fetch(`/api/offchain/balance?address=${addr}`, { cache: "no-store" }),
          fetch(`/api/offchain/staking?address=${addr}`, { cache: "no-store" }),
        ]);

        const balText = await resBal.text();
        const stakeText = await resStake.text();

        if (cancelled) return;

        let balData: any = {};
        let stakeData: any = {};

        try {
          balData = JSON.parse(balText);
        } catch {
          balData = {};
        }

        try {
          stakeData = JSON.parse(stakeText);
        } catch {
          stakeData = {};
        }

        setOffchainBalance({
  confirmedTotal: Number(balData?.confirmedTotal ?? 0),
  pendingTotal: Number(balData?.pendingTotal ?? 0),
  purchases: Array.isArray(balData?.purchases) ? balData.purchases : [],
});


        setOffchainStaking({
          totalStaked: Number(stakeData?.totalStaked ?? 0),
          activeStaked: Number(stakeData?.activeStaked ?? 0),
          earnedEstimated: Number(stakeData?.earnedEstimated ?? 0),
        });
      } catch {
        if (cancelled) return;
        setOffchainBalance({ confirmedTotal: 0, pendingTotal: 0 });
        setOffchainStaking({ totalStaked: 0, activeStaked: 0, earnedEstimated: 0 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const purchasedOmix = offchainBalance?.confirmedTotal ?? 0;
  const userUsdSpent = useMemo(() => {
  const list = offchainBalance?.purchases ?? [];
  return list.reduce((sum, p) => {
    const status = String(p?.status ?? "").trim().toLowerCase();
    if (status !== "confirmed") return sum;
    return sum + Number(p?.estimatedUsdCost ?? 0);
  }, 0);
}, [offchainBalance]);

  
  const pendingOmix = offchainBalance?.pendingTotal ?? 0;
  const hasPurchased = purchasedOmix > 0;

  const totalStaked = offchainStaking?.activeStaked ?? 0;
  const earnedFromStaking = offchainStaking?.earnedEstimated ?? 0;

  const earnedFromReferral = 0;
  const totalEarned = earnedFromStaking + earnedFromReferral;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="neon-card neon-card--hero p-4 md:p-5"
    >
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
          <p className={isConnected ? "text-lime-300 font-medium" : "text-red-300"}>
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-4">
        <p className="text-[11px] text-gray-400 mb-1">Active wallet</p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-gray-200">
            {isConnected && address ? shortenAddress(address) : "No wallet connected"}
          </span>

          {isConnected && address && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-[10px] px-2 py-1 rounded-full border border-lime-400/40 text-lime-200 hover:bg-lime-400/10 transition"
            >
              Copy
            </button>
          )}
        </div>

        {/* Referral mini-state */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">Referral</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                hasPurchased ? "border-lime-400/30 text-lime-300" : "border-yellow-400/30 text-yellow-300"
              }`}
            >
              {hasPurchased ? "Unlocked" : "Locked"}
            </span>
          </div>

          {!hasPurchased ? (
            <>
              <p className="mt-2 text-[11px] text-gray-200">
                Referral locked — buy once to unlock.
              </p>
              <p className="mt-1 text-[10px] text-gray-500">
                Unlock after your first presale purchase.
              </p>

              <div className="mt-2 h-1.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                <div className="h-full w-[10%] rounded-full bg-yellow-400/40" />
              </div>
            </>
          ) : (
            <p className="mt-2 text-[11px] text-gray-300">
              Referral tools are available in the Referral panel.
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">OMIX staked</p>
          <p className="text-sm font-semibold text-lime-300 tabular-nums">
            {totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>

          <p className="mt-1 text-[10px] text-gray-500">
            Earned:{" "}
            <span className="tabular-nums">
              {earnedFromStaking.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">Bought in presale</p>
          <p className="text-sm font-semibold text-purple-300 tabular-nums">
            {purchasedOmix.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>

          {pendingOmix > 0 ? (
            <p className="mt-1 text-[10px] text-yellow-300 tabular-nums">
              Pending: {pendingOmix.toLocaleString(undefined, { maximumFractionDigits: 2 })} OMIX
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-gray-500">—</p>
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] text-gray-400 mb-1">OMIX earned</p>
          <p className="text-sm font-semibold text-cyan-300 tabular-nums">
            {totalEarned.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
            <span className="text-[10px] text-gray-400">OMIX</span>
          </p>

          <p className="mt-1 text-[10px] text-gray-500">
            Staking:{" "}
            <span className="tabular-nums">
              {earnedFromStaking.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>{" "}
            • Referral:{" "}
            <span className="tabular-nums">
              {earnedFromReferral.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      </div>

      {/* Quick actions (modern dashboard feel) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/dashboard/presale"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold
            border border-lime-400/25 bg-gradient-to-r from-lime-400/20 via-lime-300/10 to-lime-400/20
            text-lime-100 hover:bg-lime-400/25 transition"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-lime-300/90" />
          Buy OMIX
        </a>

        <a
          href="/dashboard/staking"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold
            border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition"
        >
          Stake
        </a>

        <a
          href="#referral"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold
            border border-white/10 bg-white/5 transition ${
              hasPurchased ? "text-gray-200 hover:bg-white/10" : "text-gray-500 cursor-not-allowed pointer-events-none"
            }`}
          title={hasPurchased ? "Open Referral panel" : "Locked until first purchase"}
        >
          Referral
        </a>
      </div>
    </motion.section>
  );
}

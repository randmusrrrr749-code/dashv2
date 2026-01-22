"use client";

import { useEffect, useMemo, useState } from "react";

type PurchaseRow = {
  timestamp?: string;
  status?: string;
  paymentMode?: string;
  method?: string;
  omixAmount?: number;
  estimatedUsdCost?: number;
  txHash?: string;
};

type BalanceResp = {
  address: string;
  confirmedTotal: number;
  pendingTotal: number;
  purchases?: PurchaseRow[];
};

type StakingResp = {
  address: string;
  totalStaked: number;
  activeStaked: number;
  earnedEstimated: number;
  stakes?: any[];
};

export function useOffchainDashboard(address?: string, isConnected?: boolean) {
  const [balance, setBalance] = useState<BalanceResp | null>(null);
  const [staking, setStaking] = useState<StakingResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setBalance(null);
      setStaking(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const addr = address.toLowerCase();

    setLoading(true);

    (async () => {
      try {
        const [balRes, stakeRes] = await Promise.all([
          fetch(`/api/offchain/balance?address=${addr}`, { cache: "no-store" }),
          fetch(`/api/offchain/staking?address=${addr}`, { cache: "no-store" }),
        ]);

        const [balText, stakeText] = await Promise.all([
          balRes.text(),
          stakeRes.text(),
        ]);

        if (cancelled) return;

        const balJson = (() => {
          try {
            return JSON.parse(balText);
          } catch {
            return null;
          }
        })();

        const stakeJson = (() => {
          try {
            return JSON.parse(stakeText);
          } catch {
            return null;
          }
        })();

        setBalance(
          balJson
            ? {
                address: String(balJson.address ?? addr),
                confirmedTotal: Number(balJson.confirmedTotal ?? 0),
                pendingTotal: Number(balJson.pendingTotal ?? 0),
                purchases: Array.isArray(balJson.purchases) ? balJson.purchases : [],
              }
            : { address: addr, confirmedTotal: 0, pendingTotal: 0, purchases: [] }
        );

        setStaking(
          stakeJson
            ? {
                address: String(stakeJson.address ?? addr),
                totalStaked: Number(stakeJson.totalStaked ?? 0),
                activeStaked: Number(stakeJson.activeStaked ?? 0),
                earnedEstimated: Number(stakeJson.earnedEstimated ?? 0),
                stakes: Array.isArray(stakeJson.stakes) ? stakeJson.stakes : [],
              }
            : { address: addr, totalStaked: 0, activeStaked: 0, earnedEstimated: 0, stakes: [] }
        );
      } catch {
        if (cancelled) return;
        setBalance({ address: addr, confirmedTotal: 0, pendingTotal: 0, purchases: [] });
        setStaking({ address: addr, totalStaked: 0, activeStaked: 0, earnedEstimated: 0, stakes: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  const purchasedOmix = balance?.confirmedTotal ?? 0;
  const pendingOmix = balance?.pendingTotal ?? 0;

  // ✅ REAL USD spent (confirmed only) from your sheet column "estimatedUsdCost"
  const confirmedUsdSpent = useMemo(() => {
    const p = balance?.purchases ?? [];
    return p.reduce((sum, row) => {
      const status = String(row.status ?? "").trim().toLowerCase();
      if (status !== "confirmed") return sum;
      return sum + Number(row.estimatedUsdCost ?? 0);
    }, 0);
  }, [balance]);

  return {
    loading,
    balance,
    staking,

    purchasedOmix,
    pendingOmix,
    confirmedUsdSpent,

    activeStaked: staking?.activeStaked ?? 0,
    earnedFromStaking: staking?.earnedEstimated ?? 0,
  };
}

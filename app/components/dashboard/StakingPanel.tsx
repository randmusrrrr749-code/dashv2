"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";



type LockOption = { label: string; seconds: number; apr: number };
const LOCKS: LockOption[] = [
  { label: "Flex (no lock)", seconds: 0, apr: 1 },
  { label: "30 days", seconds: 30 * 24 * 60 * 60, apr: 2 },
  { label: "90 days", seconds: 90 * 24 * 60 * 60, apr: 4 },
  { label: "365 days", seconds: 365 * 24 * 60 * 60, apr: 6 },
  { label: "730 days", seconds: 730 * 24 * 60 * 60, apr: 9 },
];

type OffchainStakeRow = {
  id?: string;
  status: "active" | "closed" | "cancelled";
  amount: number;
  lockSeconds: number;
  apr: number;
  startTime: number;
  endTime: number;
};

type OffchainBalanceResp = {
  confirmedTotal: number;
  pendingTotal: number;
};

type OffchainStakingResp = {
  ok: boolean;
  wallet: string;
  totalStaked: number;
  activeStaked: number;
  earnedEstimated: number;
  stakes: OffchainStakeRow[];
};

function fmtDate(ts: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

function formatDurationSeconds(seconds: number) {
  if (seconds <= 0) return "flex";
  const d = Math.floor(seconds / 86400);
  if (d >= 365 && d % 365 === 0) return `${d / 365}y`;
  if (d >= 30 && d % 30 === 0) return `${d / 30}m`;
  return `${d}d`;
}

export default function StakingPanel() {
  const { address, isConnected } = useAccount();




  const [amount, setAmount] = useState<string>("");
  const [lockSeconds, setLockSeconds] = useState<number>(LOCKS[0].seconds);

  const lock = useMemo(() => {
    return LOCKS.find((l) => l.seconds === lockSeconds) ?? LOCKS[0];
  }, [lockSeconds]);

  const parsedAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
  }, [amount]);

  const [loading, setLoading] = useState(false);
  const [stakingData, setStakingData] = useState<OffchainStakingResp | null>(
    null
  );

const [offchainBalance, setOffchainBalance] =
  useState<OffchainBalanceResp | null>(null);



const refresh = async () => {
  if (!address) return;

  try {
    const [resBal, resStake] = await Promise.all([
      fetch(`/api/offchain/balance?address=${address}`, { cache: "no-store" }),
      fetch(`/api/offchain/staking?address=${address}`, { cache: "no-store" }),
    ]);

    const balText = await resBal.text();
    const stakeText = await resStake.text();

 const balData = balText ? JSON.parse(balText) : null;
const stakeData = stakeText ? JSON.parse(stakeText) : null;


    setOffchainBalance({
      confirmedTotal: Number(balData?.confirmedTotal ?? 0),
      pendingTotal: Number(balData?.pendingTotal ?? 0),
    });

    // stake endpoint response (your route.ts) returns { address, totalStaked, activeStaked, earnedEstimated, stakes }
       setStakingData({
      ok: true,
      wallet: String(stakeData?.address ?? address),
      totalStaked: Number(stakeData?.totalStaked ?? 0),
      activeStaked: Number(stakeData?.activeStaked ?? 0),
      earnedEstimated: Number(stakeData?.earnedEstimated ?? 0),
      stakes: (stakeData?.stakes ?? []) as OffchainStakeRow[],
    });


    // keep existing stakingData for rendering list (or you can remove stakingData entirely later)

  } catch (e) {
    console.error("staking refresh failed:", e);
    setOffchainBalance({ confirmedTotal: 0, pendingTotal: 0 });
    
    setStakingData(null);
  }
};


  useEffect(() => {
    if (!isConnected || !address) {
      setStakingData(null);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);
const confirmedTotal = offchainBalance?.confirmedTotal ?? 0;
const activeStaked = stakingData?.activeStaked ?? 0;


// what the user can stake right now
const availableToStake = Math.max(0, confirmedTotal - activeStaked);




const canStake =
  isConnected &&
  !!address &&
  parsedAmount > 0 &&
  parsedAmount <= availableToStake &&
  !loading;


  const handleCreateStake = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first.");
    if (!parsedAmount) return toast.error("Enter an amount.");
    if (parsedAmount > availableToStake)
  return toast.error("Not enough available OMIX to stake.");


    try {
      setLoading(true);
      toast.loading("Creating stake…", { id: "stake" });

      const res = await fetch("/api/offchain/staking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          amount: parsedAmount,
          lockSeconds: lock.seconds,
          apr: lock.apr,
        }),
      });

      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : null;

      console.log("staking/create response:", res.status, data ?? text);

      if (!res.ok || !data?.ok) {
        const msg =
          data?.error ||
          data?.zapierBody ||
          "Create stake failed";
        throw new Error(msg);
      }


      toast.success("Stake created!", { id: "stake" });
      setAmount("");
      await refresh();
    } catch (e) {
      console.error(e);
            toast.error(e instanceof Error ? e.message : "Failed to create stake.", { id: "stake" });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 shadow-[0_0_0_1px_rgba(163,230,53,0.08)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
            Staking
          </p>
          <h2 className="text-lg font-semibold text-white">
            Stake OMIX (off-chain)
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
  Available to stake:{" "}
<span className="text-gray-200 tabular-nums">
  {availableToStake.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })}{" "}
  OMIX
</span>

          </p>
        </div>

        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-gray-200 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-300">
          Connect your wallet to stake OMIX.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr,0.8fr]">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Amount (OMIX)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.0"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Lock period
              </label>
              <select
                value={lockSeconds.toString()}
                onChange={(e) => setLockSeconds(Number(e.target.value))}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30 [color-scheme:dark]"
              >
                {LOCKS.map((l) => (
                  <option
                    key={l.label}
                    value={l.seconds}
                    className="bg-black text-white"
                  >
                    {l.label} — {l.apr}% APR
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreateStake}
                disabled={!canStake}
                className="w-full rounded-xl px-3 py-2 text-sm font-semibold bg-gradient-to-r from-lime-400 to-lime-500 text-black hover:from-lime-500 hover:to-lime-400 disabled:opacity-60"
              >
                {loading ? "Processing…" : "Start staking"}
              </button>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-500">
            Staking is tracked off-chain based on your wallet holdings.
          </p>

          {/* Stakes list */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Your stakes</h3>
              <span className="text-xs text-gray-400 tabular-nums">
                {stakingData?.stakes?.length ?? 0} total
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-[1fr,0.8fr,1fr,1fr,0.7fr] gap-0 bg-white/5 px-3 py-2 text-xs text-gray-300">
                <div>Amount</div>
                <div>Lock</div>
                <div>Start</div>
                <div>End</div>
                <div className="text-right">Status</div>
              </div>

              {!stakingData?.stakes?.length ? (
                <div className="px-3 py-6 text-sm text-gray-400 bg-black/20">
                  No stakes yet.
                </div>
              ) : (
                stakingData.stakes.map((s, idx) => {
                  const ended =
                    s.endTime > 0 && Date.now() / 1000 >= Number(s.endTime);

                  return (
                    <div
                      key={s.id?.trim() ? s.id : `${s.startTime}-${s.amount}-${idx}`}
                      className="grid grid-cols-[1fr,0.8fr,1fr,1fr,0.7fr] gap-0 px-3 py-3 text-sm bg-black/20 border-t border-white/5"
                    >
                      <div className="text-white tabular-nums">
                        {Number(s.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        OMIX
                      </div>

                      <div className="text-gray-300 text-xs">
                        {formatDurationSeconds(s.lockSeconds)}
                      </div>

                      <div className="text-gray-300 text-xs">
                        {fmtDate(s.startTime)}
                      </div>

                      <div className="text-gray-300 text-xs">
                        {s.endTime ? fmtDate(s.endTime) : "-"}
                      </div>

                      <div className="text-right text-xs">
                        <span
                          className={`px-2 py-1 rounded-full border ${
                            s.status === "active"
                              ? ended
                                ? "border-yellow-400/30 text-yellow-300"
                                : "border-lime-400/30 text-lime-300"
                              : "border-white/10 text-gray-400"
                          }`}
                        >
                          {s.status === "active"
                            ? ended
                              ? "Unlocked"
                              : "Active"
                            : s.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";



type LockOption = { label: string; seconds: number; apr: number };
const LOCKS: LockOption[] = [
  { label: "No lock", seconds: 0, apr: 1 },
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
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}


function fmtAmount(n: number) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
}



function formatDurationSeconds(seconds: number) {
  if (seconds <= 0) return "No lock";
  const d = Math.floor(seconds / 86400);
  if (d >= 365 && d % 365 === 0) return `${d / 365}y`;
  if (d >= 30 && d % 30 === 0) return `${d / 30}m`;
  return `${d}d`;
}

export default function StakingPanel() {
  const { address, isConnected } = useAccount();

function estimateReward(stake: OffchainStakeRow, nowSec: number) {
  const start = Number(stake.startTime ?? 0);
  if (!start) return 0;

  const end = Number(stake.endTime ?? 0);
  const effectiveEnd = end > 0 ? Math.min(nowSec, end) : nowSec;
  const elapsed = Math.max(0, effectiveEnd - start);

  const yearSec = 365 * 24 * 60 * 60;
  const apr = Number(stake.apr ?? 0) / 100;

  return Number(stake.amount ?? 0) * apr * (elapsed / yearSec);
}



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

const [cancelOpen, setCancelOpen] = useState(false);
const [cancelStake, setCancelStake] = useState<OffchainStakeRow | null>(null);
const [cancelRewardPreview, setCancelRewardPreview] = useState<number>(0);
const [cancelIsLockedEarly, setCancelIsLockedEarly] = useState(false);


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


const openCancelModal = (s: OffchainStakeRow) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const end = Number(s.endTime ?? 0);

  const isNoLock = Number(s.lockSeconds ?? 0) <= 0 || end <= 0;
  const isEnded = end > 0 && nowSec >= end;

  const isLockedEarly = !isNoLock && !isEnded;

  setCancelStake(s);
  setCancelIsLockedEarly(isLockedEarly);
  setCancelRewardPreview(estimateReward(s, nowSec));
  setCancelOpen(true);
};

const handleConfirmCancel = async () => {
  if (!address || !cancelStake) return;

  try {
    setLoading(true);
    toast.loading("Cancelling stake…", { id: "cancel" });

    // You need a cancel endpoint. Suggested payload uses stake.id.
    // If you don't have stake.id, use (startTime, amount) as fallback identifiers.
    const res = await fetch("/api/offchain/staking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: address,
        stakeId: cancelStake.id,
        stakeStartTime: cancelStake.startTime,
        amount: cancelStake.amount,
        lockedEarly: cancelIsLockedEarly, // backend can enforce rules regardless
      }),
    });

    const text = await res.text().catch(() => "");
    const data = text ? JSON.parse(text) : null;

    if (!res.ok || !data?.ok) {
      const msg = data?.error || "Cancel stake failed";
      throw new Error(msg);
    }

    toast.success("Stake cancelled.", { id: "cancel" });
    setCancelOpen(false);
    setCancelStake(null);
    await refresh();
  } catch (e) {
    console.error(e);
    toast.error(e instanceof Error ? e.message : "Failed to cancel stake.", {
      id: "cancel",
    });
  } finally {
    setLoading(false);
  }
};







  const handleCreateStake = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first.");
    if (!parsedAmount) return toast.error("Enter an amount.");
    if (parsedAmount > availableToStake)
  return toast.error("Not enough available BLV to stake.");


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
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 shadow-[0_0_0_1px_rgba(255,0,102,0.08)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
         
<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">


  <div className="text-sm text-gray-400">
    Available:{" "}
    <span className="text-gray-200 tabular-nums">
      {availableToStake.toLocaleString(undefined, { maximumFractionDigits: 4 })} BLV
    </span>
  </div>
</div>

        </div>

        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-base text-gray-300">
          Connect your wallet to stake BLV.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1.2fr,1fr]">


            <div>
              <label className="block text-sm text-gray-400 mb-0.5">
                Amount (BLV)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.0"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/30"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-0.5">
                Lock period
              </label>
              <select
                value={lockSeconds.toString()}
                onChange={(e) => setLockSeconds(Number(e.target.value))}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 [color-scheme:dark]"
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

            <div className="sm:col-span-2 flex items-end">

              <button
                onClick={handleCreateStake}
                disabled={!canStake}
                className="w-full rounded-xl px-3 py-2 text-base font-semibold bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-500 disabled:opacity-60"
              >
                {loading ? "Processing…" : "Start staking"}
              </button>
            </div>
          </div>

         

          {/* Stakes list */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-white">Your stakes</h3>
              <span className="text-sm text-gray-400 tabular-nums">
                {stakingData?.stakes?.length ?? 0} total
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">


<div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] items-center gap-0 bg-white/5 px-3 py-2 text-sm text-gray-300">

  <div className="whitespace-nowrap">Amount</div>
  <div className="text-center whitespace-nowrap">Lock</div>
  <div className="whitespace-nowrap">Dates</div>
  <div className="text-right whitespace-nowrap">Status</div>
  <div className="text-right whitespace-nowrap">Action</div>
</div>





                  {!stakingData?.stakes?.length ? (
                    <div className="px-3 py-6 text-base text-gray-400 bg-black/20">
                      No stakes yet.
                    </div>
                  ) : (
                    stakingData.stakes.map((s, idx) => {
                      const ended =
                        s.endTime > 0 && Date.now() / 1000 >= Number(s.endTime);

                      return (
                        <div
                          key={s.id?.trim() ? s.id : `${s.startTime}-${s.amount}-${idx}`}
                          className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] items-center gap-0 px-3 py-2 text-sm bg-black/20 border-t border-white/5"
                        >
                          <div className="text-white tabular-nums whitespace-nowrap">
  {fmtAmount(s.amount)} BLV
</div>


                          <div className="text-gray-300 text-sm text-center whitespace-nowrap">
  {formatDurationSeconds(s.lockSeconds)}
</div>


<div className="text-gray-300 text-sm whitespace-nowrap">
  {fmtDate(s.startTime)}
  <span className="text-gray-500"> → </span>
  {s.endTime ? fmtDate(s.endTime) : "—"}
</div>



<div className="text-right">
  <span
    className={`inline-flex px-2 py-1.5 leading-none rounded-full border whitespace-nowrap ${
      s.status === "active"
        ? ended
          ? "border-yellow-400/30 text-yellow-300"
          : "border-pink-400/30 text-pink-300"
        : "border-white/10 text-gray-400"
    }`}
  >
    {s.status === "active" ? (ended ? "Unlocked" : "Active") : s.status}
  </span>
</div>

<div className="text-right">
  <button
    onClick={() => openCancelModal(s)}
    disabled={loading || s.status !== "active"}
    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-60 whitespace-nowrap"
  >
    Cancel
  </button>
</div>



                        </div>
                      );
                    })
                  )}
                </div>
                {cancelOpen && cancelStake && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md p-4 shadow-[0_0_0_1px_rgba(255,0,102,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-white">Cancel staking</h4>
          <p className="mt-1 text-sm text-gray-400">
            {cancelIsLockedEarly ? (
              <>
                Are you sure you want to cancel staking before it expires? The penalty is{" "}
                <span className="text-gray-200 font-medium">20% of your staked tokens</span>,
                and you will receive <span className="text-gray-200 font-medium">no staking rewards</span>.
              </>
            ) : (
              <>
                You are about to cancel staking. Your current reward is{" "}
                <span className="text-gray-200 font-medium">
                  {cancelRewardPreview.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>{" "}
                BLV.
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            setCancelOpen(false);
            setCancelStake(null);
          }}
          className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <button
          onClick={() => {
            setCancelOpen(false);
            setCancelStake(null);
          }}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 hover:bg-white/10"
        >
          Back
        </button>

        <button
          onClick={handleConfirmCancel}
          disabled={loading}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-500 disabled:opacity-60"
        >
          {loading ? "Processing…" : "Confirm"}
        </button>
      </div>
    </div>
  </div>
)}

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

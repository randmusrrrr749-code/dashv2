"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function ReferralCard({
  purchasedOmix,
  isConnected,
  address,
}: {
  purchasedOmix: number;
  isConnected: boolean;
  address?: `0x${string}` | undefined;
}) {
  const hasPurchased = purchasedOmix > 0;
  const [generated, setGenerated] = useState("");

  const referralLink = useMemo(() => {
    if (!address) return "";
    return `https://weewux.com/?ref=${address}`;
  }, [address]);

  const handleGenerate = () => {
    if (!isConnected || !address) return toast.error("Connect wallet first.");
    if (!hasPurchased) return toast.error("Referral unlocks after your first purchase.");
    setGenerated(referralLink);
    toast.success("Referral link generated!");
  };

  const handleCopy = async () => {
    const val = generated || referralLink;
    if (!val) return;
    await navigator.clipboard.writeText(val);
    toast.success("Copied!");
  };

  return (
    <section className="neon-card neon-card--soft p-4">
      <div className="flex items-start justify-between gap-3">
  <div>
    <h2 className="text-sm font-semibold text-white">Referral</h2>
    <p className="text-[11px] text-gray-400">Invite friends and earn OMIX</p>

    {/* tiny bonus hint = feels more “growth module” */}
    <div className="mt-2 inline-flex items-center gap-2 text-[10px] text-gray-400">
      <span className="px-2 py-0.5 rounded-full border border-lime-400/25 bg-lime-400/10 text-lime-200">
        +30% OMIX bonus
      </span>
      <span className="text-gray-500">on referred buys</span>
    </div>
  </div>

  <span
    className={`shrink-0 text-[10px] px-2 py-1 rounded-full border ${
      hasPurchased
        ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
        : "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
    }`}
  >
    {hasPurchased ? "Active" : "Locked"}
  </span>
</div>


      {!hasPurchased ? (
<div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
  <p className="text-[12px] text-gray-200 font-medium">
    Referral locked — buy once to unlock
  </p>
  <p className="mt-1 text-[11px] text-gray-400">
    Complete 1 presale purchase to generate your link and start earning bonuses.
  </p>

  {/* tiny honest progress */}
  <div className="mt-3">
    <div className="flex items-center justify-between text-[10px] text-gray-500">
      <span>Progress</span>
      <span className="tabular-nums">0 / 1</span>
    </div>
    <div className="mt-1 h-1.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
      <div className="h-full w-[8%] rounded-full bg-yellow-400/40" />
    </div>
  </div>

  <a
    href="/dashboard/presale"
    className="mt-3 inline-flex items-center justify-between rounded-xl border border-lime-400/25
      bg-gradient-to-r from-lime-400/15 via-lime-300/5 to-lime-400/15
      px-3 py-2 text-xs font-semibold text-lime-100
      hover:bg-lime-400/20 transition w-full"
  >
    <span>Buy now</span>
    <span>→</span>
  </a>
</div>

      ) : (
        <div className="mt-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
  <p className="text-[11px] text-gray-400">Your referral link</p>

  <div className="mt-2 flex flex-col gap-2">
    {/* link pill */}
    <div className="flex items-center justify-between gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2">
      <span className="font-mono text-[11px] text-gray-200 truncate">
        {generated || referralLink || "—"}
      </span>

      <button
        type="button"
        onClick={() => (generated ? handleCopy() : handleGenerate())}
        className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold
          bg-lime-400 text-black hover:bg-lime-300 transition"
      >
        {generated ? "Copy" : "Create link"}
      </button>
    </div>

    <p className="text-[10px] text-gray-500">
      Share on X/Telegram. Tracking can live on the Presale page later.
    </p>
  </div>
</div>


          {/* Mini stats (wire later) */}
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-1">Clicks</p>
              <p className="text-sm font-semibold text-gray-100 tabular-nums">—</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-1">Signups</p>
              <p className="text-sm font-semibold text-gray-100 tabular-nums">—</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-1">Earned</p>
              <p className="text-sm font-semibold text-lime-300 tabular-nums">0</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

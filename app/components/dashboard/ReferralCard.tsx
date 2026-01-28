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
    return `https://belvarium.com/?ref=${address}`;
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
    <section className="neon-card neon-card--soft p-4 w-full max-w-full min-w-0">
      <div className="flex items-start justify-between gap-3">
  <div>
    <h2 className="text-base font-semibold text-white">Referral</h2>
    

    {/* tiny bonus hint = feels more “growth module” */}
    <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-400">
      <span className="px-2 py-0.5 rounded-full border border-pink-400/25 bg-pink-400/10 text-pink-200">
        +30% BLV bonus
      </span>
      <span className="text-gray-500">on referred buys</span>
    </div>
  </div>

  <span
    className={`shrink-0 text-sm px-2 py-1 rounded-full border ${
      hasPurchased
        ? "border-pink-400/30 bg-pink-400/10 text-pink-300"
        : "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
    }`}
  >
    {hasPurchased ? "Active" : "Locked"}
  </span>
</div>


      {!hasPurchased ? (
<div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
  <p className="text-base text-gray-200 font-medium">
    Referral locked — buy once to unlock
  </p>
  <p className="mt-1 text-sm text-gray-400">
    Complete 1 presale purchase to generate your link and start earning bonuses.
  </p>

  {/* tiny honest progress */}
  <div className="mt-3">
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>Progress</span>
      <span className="tabular-nums">0 / 1</span>
    </div>
    <div className="mt-1 h-1.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
      <div className="h-full w-[8%] rounded-full bg-yellow-400/40" />
    </div>
  </div>

  <a
    href="/dashboard/presale"
    className="mt-3 inline-flex items-center justify-between rounded-xl border border-pink-400/25
      bg-gradient-to-r from-pink-400/15 via-pink-300/5 to-pink-400/15
      px-3 py-2 text-sm font-semibold text-pink-100
      hover:bg-pink-400/20 transition w-full"
  >
    <span>Buy now</span>
    <span>→</span>
  </a>
</div>

      ) : (
        <div className="mt-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
  <p className="text-sm text-gray-400">Your referral link</p>

  <div className="mt-2 flex flex-col gap-2">
    {/* link pill */}
<div className="flex items-center justify-between gap-2 min-w-0 rounded-xl bg-black/40 border border-white/10 px-3 py-2">
  <span className="min-w-0 font-mono text-sm text-gray-200 truncate">
    {generated || referralLink || "—"}
  </span>

      <button
        type="button"
        onClick={() => (generated ? handleCopy() : handleGenerate())}
        className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold
          bg-pink-500 text-white hover:bg-pink-400 transition"
      >
        {generated ? "Copy" : "Create link"}
      </button>
    </div>

    <p className="text-sm text-gray-500">
      Share on X/Telegram. Tracking can live on the Presale page later.
    </p>
  </div>
</div>


          {/* Mini stats (wire later) */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-sm text-gray-400 mb-1">Clicks</p>
              <p className="text-base font-semibold text-gray-100 tabular-nums">—</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-sm text-gray-400 mb-1">Signups</p>
              <p className="text-base font-semibold text-gray-100 tabular-nums">—</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
              <p className="text-sm text-gray-400 mb-1">Earned</p>
              <p className="text-base font-semibold text-pink-300 tabular-nums">0</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import PresalePanel from "../../components/PresalePanel";

export default function PresalePage() {
  return (
    <DashboardLayout>
      <section className="mx-auto w-full max-w-6xl pt-1 md:pt-2">
        {/* Page header */}
        <div className="mb-5">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">
            BLV Presale
          </p>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg md:text-xl font-semibold text-white">
              Buy BLV
            </h1>

            <span className="shrink-0 px-2 py-1 rounded-full text-sm bg-pink-500/10 border border-pink-500/40 text-pink-300">
              Live
            </span>
          </div>

          <p className="mt-1 text-base text-gray-300 max-w-2xl">
            Buy BLV using ETH, USDT, USDC or manual methods. Your purchases will appear on the dashboard overview and leaderboard.
          </p>
        </div>

        <PresalePanel />
      </section>
    </DashboardLayout>
  );
}

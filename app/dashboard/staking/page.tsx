"use client";

import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StakingPanel from "../../components/dashboard/StakingPanel";

export default function StakingPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Staking</h1>
        <p className="text-base text-gray-400">
          Stake BLV, view positions, withdraw, and reinvest.
        </p>
      </div>

      <StakingPanel />
    </DashboardLayout>
  );
}

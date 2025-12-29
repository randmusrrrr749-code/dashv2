"use client";

import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAccount } from "wagmi";

function SettingsCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 shadow-[0_0_0_1px_rgba(163,230,53,0.08)]">
      <h2 className="text-sm font-semibold text-white mb-2">{title}</h2>
      <div className="text-sm text-gray-300">{children}</div>
      {footer ? <div className="mt-3 text-xs text-gray-400">{footer}</div> : null}
    </div>
  );
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400">
          Wallet preferences, referral info, and dashboard options.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Wallet & Account"
          footer="Wallet connection is managed by your browser wallet (MetaMask / Rabby)."
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Connected wallet
              </div>
              <div className="mt-1 text-sm">
                {isConnected && address ? (
                  <span className="text-lime-300 font-medium">{address}</span>
                ) : (
                  <span className="text-gray-500">Not connected</span>
                )}
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs border ${
                isConnected
                  ? "border-lime-400/30 text-lime-300 bg-lime-400/10"
                  : "border-white/10 text-gray-400 bg-white/5"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Referral Preferences"
          footer="Referral rewards are applied when you generate or use a referral link."
        >
          <p className="text-gray-300">
            No manual configuration required right now.
          </p>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Current bonus
            </div>
            <div className="mt-1 text-lime-300 font-semibold">+30% OMIX</div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Display"
          footer="Theme customization can be added later (dark / neon / compact modes)."
        >
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Appearance
              </div>
              <div className="mt-1 text-sm text-gray-300">
                Follows dashboard theme
              </div>
            </div>
            <span className="text-xs text-purple-300 border border-purple-400/20 bg-purple-400/10 px-3 py-1 rounded-full">
              Default
            </span>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Notifications"
          
        >
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
            No new notifications.
          </div>
        </SettingsCard>

        <div className="lg:col-span-2">
          <SettingsCard
            title="Security"
            footer="All transactions require wallet confirmation. The dashboard never holds your funds."
          >
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Always verify contract addresses before confirming.</li>
              <li>Never share seed phrases or private keys.</li>
              <li>Use a hardware wallet for large amounts.</li>
            </ul>
          </SettingsCard>
        </div>
      </section>
    </DashboardLayout>
  );
}

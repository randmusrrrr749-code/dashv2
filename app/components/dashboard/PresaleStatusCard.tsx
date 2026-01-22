"use client";

import React from "react";

type PromoConfig = {
  enabled?: boolean;
  endsAt?: string;
  tag: string;
  title: string;
  body: string;
  highlight_from: number;
  badge: string;
  endsText: string;
};

export default function PresaleStatusCard({
  promoVisible,
  promo,
}: {
  promoVisible: boolean;
  promo?: PromoConfig | null;
}) {
  return (
    <section className="neon-card neon-card--soft p-4 text-sm text-gray-300">
      {/* subtle top rim (keep, but smaller) */}
      <div className="pointer-events-none -mt-4 -mx-4 mb-3">
        <div className="h-[2px] bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.6),transparent)] opacity-60" />
        <div className="h-[8px] bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.14),transparent_70%)] blur-[2px]" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Presale</h2>
          <p className="text-[11px] text-gray-400">
            Buy OMIX • Earn bonus • Stake up to 95%
          </p>
        </div>

        <span className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-200">
          Live
        </span>
      </div>

      {/* Primary CTA */}
      <a
        href="/dashboard/presale"
        className="group mt-3 flex items-center justify-between rounded-2xl border border-lime-400/25
          bg-gradient-to-r from-lime-400/20 via-lime-300/10 to-lime-400/20
          px-4 py-3 text-xs font-semibold text-lime-100
          shadow-[0_0_0_1px_rgba(163,230,53,0.10),0_0_22px_rgba(163,230,53,0.12)]
          hover:bg-lime-400/25 hover:shadow-[0_0_0_1px_rgba(163,230,53,0.14),0_0_30px_rgba(163,230,53,0.18)]
          transition"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-lime-300/90 shadow-[0_0_14px_rgba(163,230,53,0.35)]" />
          Buy OMIX
          <span className="text-[10px] text-gray-300/80 font-normal">
            (Presale)
          </span>
        </span>

        <span className="text-gray-300 group-hover:text-white transition">
          →
        </span>
      </a>

      {/* Secondary actions (modern tiles instead of list rows) */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Referral */}
        <a
          href="/dashboard/presale"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2
            hover:bg-white/[0.06] transition"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-300">Referral bonus</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-lime-400/25 bg-lime-400/10 text-lime-200">
              +30%
            </span>
          </div>

          <p className="mt-1 text-[10px] text-gray-500">
            Share link after first buy
          </p>
        </a>

        {/* Staking */}
        <a
          href="/dashboard/staking"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2
            hover:bg-white/[0.06] transition"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-300">Staking</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-200">
              Up to 95%
            </span>
          </div>

          <p className="mt-1 text-[10px] text-gray-500">
            Lock for higher APR
          </p>
        </a>
      </div>

      {/* Promo (clean, premium alert style) */}
      {promoVisible && promo && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400">
                {promo.tag}
              </p>

              <p className="text-sm font-semibold text-white">
                {promo.title}
              </p>

              <p className="mt-1 text-[11px] text-gray-300">
                {promo.body.slice(0, promo.highlight_from)}
                <span className="text-amber-200 font-semibold">
                  {promo.body.slice(promo.highlight_from)}
                </span>
              </p>
            </div>

            <span className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-white/10 bg-black/30 text-gray-200">
              {promo.badge}
            </span>
          </div>

          <p className="mt-2 text-[10px] text-gray-500">{promo.endsText}</p>
        </div>
      )}
    </section>
  );
}

"use client";

import React, { useMemo, useState } from "react";

import type { SimTx } from "./sim/presaleSim";


// (Optional) keep this if you still want icons




type TxStatus = "Pending" | "Confirmed" | "Failed";

function StatusPill({ status }: { status: TxStatus }) {
  const cls =
    status === "Confirmed"
      ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
      : status === "Pending"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
      : "border-red-400/30 bg-red-400/10 text-red-200";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function timeAgoFromMs(ts: number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));

  // < 1 min
  if (diffSec < 60) return "just now";

  const min = Math.floor(diffSec / 60);

  // < 1 hour -> minutes
  if (min < 60) return `${min}m ago`;

  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;

  const d = Math.floor(h / 24);
  return `${d}d ago`;
}


function formatUsd(usd: number) {
  return `+$${Math.round(usd).toLocaleString()}`;
}

export default function LatestTransactionsCard({ txs }: { txs: SimTx[] }) {
  const PAGE_SIZE = 5;
const MAX_PAGES = 5;

const [page, setPage] = useState(0);

const sorted = useMemo(() => [...txs].sort((a, b) => b.ts - a.ts), [txs]);

const totalPages = useMemo(() => {
  // how many pages we *actually* have based on tx count
  const real = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  return Math.min(MAX_PAGES, real);
}, [sorted]);

// keep page in bounds if txs shrink
const safePage = Math.min(page, totalPages - 1);

const rows = useMemo(() => {
  const start = safePage * PAGE_SIZE;
  return sorted.slice(start, start + PAGE_SIZE);
}, [sorted, safePage]);


  return (
    <section className="neon-card neon-card--soft p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Latest Transactions</h2>
          <p className="text-[11px] text-gray-400">Live presale activity</p>
        </div>

    <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
  Page {safePage + 1} / {MAX_PAGES}
</span>

      </div>

      <div className="space-y-2">
        {rows.map((tx) => (
          <div
            key={tx.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5
              hover:bg-white/[0.05] transition flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="mt-[2px] inline-flex h-2 w-2 rounded-full bg-lime-300/80 shadow-[0_0_12px_rgba(163,230,53,0.35)]" />
              {/* or: <TypeIcon kind="Presale" /> */}

              <div className="min-w-0">
                <p className="text-[12px] text-gray-200 truncate">
                  <span className="text-gray-400">Presale</span>
                  <span className="text-gray-500"> • </span>
                  <span className="tabular-nums font-medium text-gray-100">
                    {formatUsd(tx.usd)}
                  </span>
                  <span className="text-gray-500"> • </span>
                  <span className="font-mono text-[11px] text-gray-300">
                    {tx.address}
                  </span>
                </p>
                <p className="text-[10px] text-gray-500">{timeAgoFromMs(tx.ts)}</p>
              </div>
            </div>

            <StatusPill status="Confirmed" />
          </div>
        ))}
      </div>
      {/* Pagination */}
<div className="mt-3 flex items-center justify-between">
  <button
    type="button"
    onClick={() => setPage((p) => Math.max(0, p - 1))}
    disabled={safePage === 0}
    className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
  >
    ← Prev
  </button>

  <div className="flex items-center gap-1.5">
    {Array.from({ length: MAX_PAGES }).map((_, i) => {
      const disabled = i >= totalPages;
      const active = i === safePage;

      return (
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          disabled={disabled}
          className={`h-7 min-w-7 px-2 rounded-full border text-[10px] transition
            ${active ? "border-lime-400/60 bg-lime-400/15 text-lime-200" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"}
            ${disabled ? "opacity-30 cursor-not-allowed hover:bg-white/5" : ""}`}
        >
          {i + 1}
        </button>
      );
    })}
  </div>

  <button
    type="button"
    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
    disabled={safePage >= totalPages - 1}
    className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
  >
    Next →
  </button>
</div>

    </section>
  );
}

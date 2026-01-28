"use client";

import { useChainId } from "wagmi";

const BLV_TOKEN = "0xb9A091213246Ee02c8BFF4e86D84b0C3536d0631";
const PRESALE = "0x4a6dfa7d9880F66E82fF513bcd04F94b1EfD1Aa8";
// Put your staking contract address here after you deploy it:
const STAKING = "TBD";

function row(label: string, value: string, link?: string) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <p className="text-sm text-gray-400">{label}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-pink-300 hover:text-pink-200 underline break-all text-right"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-200 break-all text-right">{value}</p>
      )}
    </div>
  );
}

export default function AboutContractsCard() {
  const chainId = useChainId();

  const explorerBase =
    chainId === 1
      ? "https://etherscan.io"
      : chainId === 11155111
      ? "https://sepolia.etherscan.io"
      : null;

  const addrLink = (a: string) =>
    explorerBase && a.startsWith("0x") ? `${explorerBase}/address/${a}` : undefined;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
        About & Contracts
      </p>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        {row("BLV Token", BLV_TOKEN, addrLink(BLV_TOKEN))}
        <div className="h-px bg-white/10" />
        {row("Presale Contract", PRESALE, addrLink(PRESALE))}
        <div className="h-px bg-white/10" />
        {row("Staking Contract", STAKING, addrLink(STAKING))}
      </div>

      <div className="mt-3 text-sm text-gray-400">
        Dashboard v1.0 · Network Chain ID: {chainId}
      </div>
    </div>
  );
}

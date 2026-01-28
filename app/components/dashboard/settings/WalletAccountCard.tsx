"use client";

import { useAccount, useDisconnect, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default function WalletAccountCard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const explorerBase =
    chainId === 1
      ? "https://etherscan.io"
      : chainId === 11155111
      ? "https://sepolia.etherscan.io"
      : null;

  const addrUrl = explorerBase && address ? `${explorerBase}/address/${address}` : null;

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
        Wallet & Account
      </p>

      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-base text-gray-300">
            Connect your wallet to access presale, staking, and referrals.
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">Connected wallet</p>
                <p className="text-base font-semibold">{shortAddr(address)}</p>
              </div>
              <button
                onClick={copy}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-gray-200 hover:bg-black/50"
              >
                Copy
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-400">Network</p>
              <p className="text-sm text-gray-200">Chain ID: {chainId}</p>
            </div>

            {addrUrl && (
              <a
                href={addrUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-pink-300 hover:text-pink-200 underline"
              >
                View on explorer
              </a>
            )}
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 py-2.5 text-base font-semibold text-white hover:from-pink-600 hover:to-pink-500"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

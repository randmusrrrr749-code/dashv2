"use client";

export default function SecurityCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
        Security
      </p>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="text-sm text-gray-200">Safety notice</p>
        <p className="text-sm text-gray-400 mt-1">
          BLV will never ask for your private keys or seed phrase.
        </p>

        <a
          href="https://revoke.cash/"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-pink-300 hover:text-pink-200 underline"
        >
          Revoke token approvals (recommended)
        </a>
      </div>
    </div>
  );
}

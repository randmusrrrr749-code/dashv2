"use client";

import { useEffect, useState } from "react";

type Currency = "USD" | "ETH";
type Numbers = "compact" | "full";

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

export default function PreferencesCard() {
  const [currency, setCurrency] = useLocalStorageState<Currency>(
    "blv_pref_currency",
    "USD"
  );
  const [numbers, setNumbers] = useLocalStorageState<Numbers>(
    "blv_pref_numbers",
    "compact"
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
        Preferences
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Display currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-base text-gray-100"
          >
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
          </select>
          <p className="text-sm text-gray-400 mt-1">
            This affects how values are shown across the dashboard (UI only).
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Number formatting
          </label>
          <select
            value={numbers}
            onChange={(e) => setNumbers(e.target.value as Numbers)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-base text-gray-100"
          >
            <option value="compact">Compact (12.5k)</option>
            <option value="full">Full (12,543.23)</option>
          </select>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-sm text-gray-400">Saved preferences</p>
          <p className="text-base text-gray-200 mt-1">
            Currency: <span className="text-pink-300 font-semibold">{currency}</span> ·
            Numbers: <span className="text-pink-300 font-semibold">{numbers}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

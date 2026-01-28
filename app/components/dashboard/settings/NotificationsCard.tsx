"use client";

export default function NotificationsCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
        Notifications
      </p>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="text-sm text-gray-200">Coming soon</p>
        <p className="text-sm text-gray-400 mt-1">
          Presale updates, staking unlock reminders, and referral notifications.
        </p>
      </div>
    </div>
  );
}

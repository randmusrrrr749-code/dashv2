"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Image from "next/image";



type DashboardLayoutProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/presale", label: "Presale" },
  { href: "/dashboard/staking", label: "Staking" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const fxRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef(0);

  const [mobileOpen, setMobileOpen] = useState(false);

  // close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // lock body scroll when drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    scrollYRef.current = window.scrollY || 0;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [mobileOpen]);

  // focus trap + escape close for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    drawer.focus();

    const getFocusable = () =>
      drawer.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (e.key !== "Tab") return;
      const focusable = Array.from(getFocusable()).filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener("keydown", onKeyDown);
    return () => drawer.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // mouse parallax for background FX
  useEffect(() => {
    const el = fxRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width; // 0..1
      const y = (e.clientY - r.top) / r.height; // 0..1
      const mx = x - 0.5; // -0.5..0.5
      const my = y - 0.5;

      el.style.setProperty("--mx", mx.toFixed(4));
      el.style.setProperty("--my", my.toFixed(4));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="px-4 py-4 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center justify-between px-3 py-2 text-base rounded-lg transition ${
              active
                ? "bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-semibold"
                : "text-gray-300 hover:bg-white/5"
            }`}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#050712] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 border-r border-white/5 bg-black/40">
        <div className="px-3 py-4 border-b border-white/5">
  <Link href="/dashboard" className="flex items-center">
    <Image
      src="/images/logo3.png"
      alt="Belvarium"
      width={250}
      height={60}
      priority
      className="h-10 w-auto"
    />
  </Link>
</div>


        <NavLinks />

        <div className="px-4 py-4 border-t border-white/5 text-sm text-gray-400">
          <p>Belvarium Dashboard</p>
          <p className="text-sm mt-1">Manage BLV, staking & presale.</p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className="fixed z-50 left-0 top-0 h-full w-[82%] max-w-[320px] bg-black/70 backdrop-blur-xl border-r border-white/10 outline-none"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <Link
  href="/dashboard"
  onClick={() => setMobileOpen(false)}
  className="flex items-center"
>
  <Image
    src="/images/logo3.png"
    alt="Belvarium"
    width={250}
    height={60}
    priority
    className="h-9 w-auto"
  />
</Link>


              <button
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <NavLinks onClick={() => setMobileOpen(false)} />

            <div className="px-4 py-4 border-t border-white/10 text-sm text-gray-400">
              <p>Belvarium Dashboard</p>
              <p className="text-sm mt-1">Control center for BLV.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-black/30 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              {/* hamburger */}
              <span className="block w-5">
                <span className="block h-[2px] w-5 bg-white/80 mb-1" />
                <span className="block h-[2px] w-5 bg-white/70 mb-1" />
                <span className="block h-[2px] w-5 bg-white/60" />
              </span>
            </button>

            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-gray-400">
                Belvarium Dashboard
              </p>
              <p className="text-base text-gray-100">Control center for BLV</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectButton />
          </div>
        </header>

        {/* Page */}
        <main className="relative flex-1 px-4 md:px-8 py-6 overflow-hidden bg-[#050712]">
          {/* Background FX */}
          <div
            ref={fxRef}
                className="pointer-events-none absolute inset-0 hidden md:block"
            style={{ ["--mx" as any]: 0, ["--my" as any]: 0 }}
          >
            {/* Base atmosphere - Bellarium pink/cyan */}
            <div
              className="absolute inset-0 opacity-95"
              style={{
                backgroundImage: `
                  radial-gradient(1200px 620px at 50% 10%, rgba(255,0,102,0.22), transparent 62%),
                  radial-gradient(900px 560px at 18% 65%, rgba(0,212,255,0.12), transparent 65%),
                  radial-gradient(900px 560px at 88% 75%, rgba(255,0,102,0.10), transparent 65%),
                  radial-gradient(900px 520px at 70% 120%, rgba(0,212,255,0.08), transparent 60%),
                  linear-gradient(180deg, rgba(255,0,102,0.05), transparent 55%, rgba(0,0,0,0.0) 100%)
                `,
              }}
            />

            {/* Spotlight cone - Bellarium pink */}
            <div
              className="absolute inset-0 opacity-70 mix-blend-screen"
              style={{
                backgroundImage: `
                  radial-gradient(600px 380px at 52% 18%, rgba(255,255,255,0.08), transparent 62%),
                  radial-gradient(900px 620px at 52% 34%, rgba(255,0,102,0.10), transparent 70%),
                  linear-gradient(180deg, rgba(255,0,102,0.10), transparent 55%)
                `,
                filter: "blur(18px)",
              }}
            />

            {/* Procedural terrain + dust */}
            <svg
              className="absolute inset-0 h-full w-full opacity-95 mix-blend-overlay"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              style={{ filter: "contrast(1.25) saturate(1.15)" }}
            >
              <defs>
                <filter id="terrain">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.006"
                    numOctaves="4"
                    seed="2"
                  />
                  <feColorMatrix
                    type="matrix"
                    values="
                      2.4 0 0 0 -0.85
                      0 2.4 0 0 -0.85
                      0 0 2.4 0 -0.85
                      0 0 0 1  0
                    "
                  />
                  <feDisplacementMap in="SourceGraphic" scale="28" />
                  <feGaussianBlur stdDeviation="0.55" />
                </filter>

                <linearGradient id="horizonMask" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="black" stopOpacity="0" />
                  <stop offset="46%" stopColor="black" stopOpacity="0" />
                  <stop offset="60%" stopColor="white" stopOpacity="1" />
                  <stop offset="84%" stopColor="white" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="black" stopOpacity="0" />
                </linearGradient>

                <mask id="maskHorizon">
                  <rect
                    x="0"
                    y="0"
                    width="1000"
                    height="1000"
                    fill="url(#horizonMask)"
                  />
                </mask>

                <linearGradient id="terrainTint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,212,255,0)" />
                  <stop offset="58%" stopColor="rgba(0,212,255,0.28)" />
                  <stop offset="78%" stopColor="rgba(255,0,102,0.14)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>

                <filter id="specks">
                  <feTurbulence
                    type="turbulence"
                    baseFrequency="0.9"
                    numOctaves="2"
                    seed="8"
                  />
                  <feColorMatrix
                    type="matrix"
                    values="
                      7 0 0 0 -2.7
                      0 7 0 0 -2.7
                      0 0 7 0 -2.7
                      0 0 0 1  0
                    "
                  />
                  <feGaussianBlur stdDeviation="0.25" />
                </filter>
              </defs>

              <rect
                x="0"
                y="0"
                width="1000"
                height="1000"
                filter="url(#terrain)"
                fill="url(#terrainTint)"
                opacity="0.85"
                mask="url(#maskHorizon)"
              />

              <rect
                x="0"
                y="0"
                width="1000"
                height="1000"
                filter="url(#specks)"
                opacity="0.12"
              />
            </svg>

            {/* Sheen */}
            <div
              className="absolute inset-0 opacity-[0.07] mix-blend-screen"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)",
                filter: "blur(18px)",
                transform: "translateY(-10%)",
              }}
            />

            {/* Vignette */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 62%, rgba(0,0,0,0.97) 100%),
                  linear-gradient(180deg, rgba(0,0,0,0.55), transparent 18%, transparent 82%, rgba(0,0,0,0.70))
                `,
              }}
            />

            {/* Noise tile */}
            <div
              className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
              style={{
                backgroundImage: "url(/noise.png)",
                backgroundRepeat: "repeat",
              }}
            />

            {/* Particles (masked to horizon band) */}
            <div
              className="absolute inset-0 opacity-70"
              style={{
                WebkitMaskImage:
                  "radial-gradient(900px 380px at 52% 62%, black 35%, transparent 75%)",
                maskImage:
                  "radial-gradient(900px 380px at 52% 62%, black 35%, transparent 75%)",
              }}
            >
              <div className="bg-particles absolute inset-0" />
            </div>
          </div>

          {/* Content */}
          <div className="relative max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

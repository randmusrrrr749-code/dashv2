"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  SiEthereum,
  SiTether,
  SiBitcoin,
  SiSolana,
  SiXrp,
} from "react-icons/si";
import { FaRegCreditCard } from "react-icons/fa";

import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, parseUnits } from "viem";
import ERC20ABI from "../abi/ERC20.json";
import Image from "next/image";
import toast from "react-hot-toast";
import PresaleABI from "../abi/weewuxPresale.json";
import QRCode from "react-qr-code";

import { PROMO } from "../../promo.config";


// -----------------------
// TYPES
// -----------------------
type ManualMethod = "BTC" | "ETH" | "USDT" | "SOL" | "XRP" | "CARD";

type PromoData = {
  enabled: boolean;
  tag: string;
  title: string;
  body: string;
  badge: string;
  endsText: string;
  endsAt?: string;              // ISO date string from sheet
  highlight_from?: number;
  discountPercentage?: number;  // <-- NEW (ex: 20 means +20% OMIX)
};


// -----------------------
// CONFIG
// -----------------------
const PRESALE_ADDRESS = "0x4a6dfa7d9880F66E82fF513bcd04F94b1EfD1Aa8";

export const TOKEN_ADDRESSES = {
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

// Fallback manual payment static addresses – used if remote config fails
const FALLBACK_MANUAL_PAYMENT_ADDRESSES: Record<
  Exclude<ManualMethod, "CARD">,
  string
> = {
  BTC: "bc1q5v4lph7wfx40wzxvfxctjuwujx863eyfkx3f3e",
  SOL: "DXje1HB1Z3DdLuSHxATiSrM3xvyyyoKpiGK5ZNZ4hvuV",
  XRP: "YOUR_XRP_ADDRESS_HERE",
  ETH: "YOUR_ETH_ADDRESS_HERE",
  USDT: "YOUR_USDT_ADDRESS_HERE", // e.g. ERC20 address
};

// Theming for manual payment popup & controls
const MANUAL_THEMES: Record<
  Exclude<ManualMethod, "CARD">,
  {
    border: string;
    bgVia: string;
    buttonGradient: string;
    ring: string;
    accentText: string;
  }
> = {
  BTC: {
    border: "border-amber-400/60",
    bgVia: "via-amber-900/40",
    buttonGradient:
      "from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-400",
    ring: "focus:ring-amber-400",
    accentText: "text-amber-300",
  },
  SOL: {
    border: "border-emerald-400/60",
    bgVia: "via-emerald-900/40",
    buttonGradient:
      "from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400",
    ring: "focus:ring-emerald-400",
    accentText: "text-emerald-300",
  },
  XRP: {
    border: "border-indigo-400/60",
    bgVia: "via-indigo-900/40",
    buttonGradient:
      "from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400",
    ring: "focus:ring-indigo-400",
    accentText: "text-indigo-300",
  },
  ETH: {
    border: "border-cyan-400/60",
    bgVia: "via-cyan-900/40",
    buttonGradient:
      "from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400",
    ring: "focus:ring-cyan-400",
    accentText: "text-cyan-300",
  },
  USDT: {
    border: "border-emerald-300/60",
    bgVia: "via-emerald-800/40",
    buttonGradient:
      "from-emerald-300 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300",
    ring: "focus:ring-emerald-300",
    accentText: "text-emerald-200",
  },
};

// For the small method pills
const METHOD_PILL_ACTIVE: Record<ManualMethod, string> = {
  BTC: "bg-amber-400 text-black border-amber-300",
  SOL: "bg-emerald-400 text-black border-emerald-300",
  XRP: "bg-indigo-400 text-black border-indigo-300",
  ETH: "bg-cyan-400 text-black border-cyan-300",
  USDT: "bg-emerald-300 text-black border-emerald-200",
  CARD: "bg-pink-400 text-black border-pink-300",
};

// -----------------------
// PRICE / TIME CONFIG (FIXED)
// -----------------------
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const INITIAL_PRICE = 0.015;
const DAILY_MULT = 1.03; // +3% every 24h

const FALLBACK_START = new Date("2025-12-29T23:00:00Z").getTime();

const GLOBAL_START = (() => {
  const raw = process.env.NEXT_PUBLIC_PRESALE_START;

  if (!raw) return FALLBACK_START;

  // If it looks like a date (contains '-' or 'T'), parse as ISO/date string
  if (raw.includes("-") || raw.includes("T")) {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : FALLBACK_START;
  }

  // Otherwise treat as numeric timestamp
  let n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return FALLBACK_START;

  // seconds -> ms
  if (n < 1_000_000_000_000) n *= 1000;

  return n;
})();


export default function PresalePanel() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const isClient = () => typeof window !== "undefined";

  const [currency, setCurrency] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [coreAmount, setCoreAmount] = useState("0");
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [usdValue, setUsdValue] = useState(0);
  const [isMinAmountValid, setIsMinAmountValid] = useState(true);

  // prices in USD
  const [prices, setPrices] = useState({
    eth: 0,
    usdt: 1,
    usdc: 1,
    btc: 0,
    sol: 0,
    xrp: 0,
  });



  const FALLBACK_PROGRESS_PERCENT = 91;
const [progressPercent, setProgressPercent] =
  useState<number>(FALLBACK_PROGRESS_PERCENT);


  // -----------------------
  // PRICE EVOLUTION (FIXED)
  // -----------------------
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  const [nextPrice, setNextPrice] = useState(
    Number((INITIAL_PRICE * DAILY_MULT).toFixed(4))
  );

  // Referral system
  const [referralCode, setReferralCode] = useState("");
  const [generatedReferral, setGeneratedReferral] = useState("");
  const [referralMode] = useState<"bonus" | "referral">("bonus"); // reserved for future use
  const [bonusApplied] = useState(false); // reserved for future use
  const [referralUsed, setReferralUsed] = useState(false);
  const [referralBonus, setReferralBonus] = useState(0);
  const [showReferralNotice, setShowReferralNotice] = useState(false);
  const [referralPopupOpen, setReferralPopupOpen] = useState(false);
  const promo = PROMO;

const promoDiscountPctRaw = Number(promo?.discountPercentage ?? 0);
const promoDiscountPct = Number.isFinite(promoDiscountPctRaw)
  ? Math.min(100, Math.max(0, promoDiscountPctRaw))
  : 0;


const promoEndsAtMs = promo?.endsAt ? Date.parse(promo.endsAt) : NaN;
const promoNotExpired =
  !promo?.endsAt || Number.isNaN(promoEndsAtMs) || Date.now() < promoEndsAtMs;

const promoActive = !!promo?.enabled && promoNotExpired && promoDiscountPct > 0;
const promoMultiplier = promoActive ? 1 + promoDiscountPct / 100 : 1;




  // Manual payment modal (BTC / SOL / XRP etc.)
  const [manualPaymentModalOpen, setManualPaymentModalOpen] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] =
    useState<ManualMethod>("BTC");

  const [manualDropdownOpen, setManualDropdownOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState(""); // OMIX tokens
  const [manualEmail, setManualEmail] = useState("");
  const [manualReceiveAddress, setManualReceiveAddress] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Manual addresses loaded from remote config (Google Sheet)
  const [manualAddresses, setManualAddresses] = useState<
    Record<Exclude<ManualMethod, "CARD">, string>
  >(FALLBACK_MANUAL_PAYMENT_ADDRESSES);

  const [manualSuccessOpen, setManualSuccessOpen] = useState(false);
  const [manualSuccessData, setManualSuccessData] = useState<{
  method: ManualMethod;
  coinAmount: number;
  usdCost: number;
  tokens: number;
  email: string;
  receiveAddress: string;
} | null>(null);


  const [manualEmailError, setManualEmailError] = useState("");

// -----------------------
// PRICE FETCH (ETH, USDT, USDC, BTC, SOL, XRP)
// -----------------------
useEffect(() => {
  let cancelled = false;

  async function fetchPrices() {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);

      const data = await res.json();

      if (cancelled) return;

      setPrices({
        eth: data.ethereum?.usd ?? 0,
        usdt: data.tether?.usd ?? 1,
        usdc: data["usd-coin"]?.usd ?? 1,
        btc: data.bitcoin?.usd ?? 0,
        sol: data.solana?.usd ?? 0,
        xrp: data.ripple?.usd ?? 0,
      });
    } catch (err) {
      if (!cancelled) {
        console.error("Failed to fetch prices:", err);
      }
    }
  }

  fetchPrices();
  const interval = setInterval(fetchPrices, 60_000);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, []);






  // -----------------------
  // LOAD MANUAL ADDRESSES FROM GOOGLE SHEET CONFIG
  // -----------------------
  useEffect(() => {
    const url = "/api/address-config"; // proxy through Next.js backend

    const loadConfig = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Config fetch failed with status ${res.status}`);
        }
        const csv = await res.text();

        const lines = csv
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          console.warn("Address config CSV has no data rows, using fallback.");
          return;
        }

        const headerLine = lines[0];
        const headers = headerLine
          .split(",")
          .map((h) => h.trim().toLowerCase());

        const coinIdx = headers.indexOf("coin");
        const addressIdx = headers.indexOf("address");
        const activeIdx = headers.indexOf("active");

        if (coinIdx === -1 || addressIdx === -1) {
          console.warn(
            "Address config CSV missing 'coin' or 'address' columns – using fallback."
          );
          return;
        }

        const updated: Record<Exclude<ManualMethod, "CARD">, string> = {
          ...FALLBACK_MANUAL_PAYMENT_ADDRESSES,
        };

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const cols = row.split(",");

          const rawCoin = (cols[coinIdx] || "").trim().toUpperCase();
          const addr = (cols[addressIdx] || "").trim();
          const rawActive =
            activeIdx >= 0 ? (cols[activeIdx] || "").trim().toLowerCase() : "true";

          if (!rawCoin || !addr) continue;

          const isActive =
            rawActive === "" ||
            rawActive === "true" ||
            rawActive === "1" ||
            rawActive === "yes";

          if (!isActive) continue;

          if (rawCoin === "PROGRESS") {
           const n = Number(addr);
           if (Number.isFinite(n)) {
           setProgressPercent(Math.max(0, Math.min(100, Math.round(n))));
           }
           continue;
            }


          if (
            rawCoin === "BTC" ||
            rawCoin === "SOL" ||
            rawCoin === "XRP" ||
            rawCoin === "ETH" ||
            rawCoin === "USDT"
          ) {
            updated[rawCoin] = addr;
          }
        }

        setManualAddresses(updated);
        console.log("Loaded manual payment addresses from config:", updated);
      } catch (err) {
        console.error(
          "Failed to load manual payment address config – using fallback.",
          err
        );
      }
    };

    loadConfig();
  }, []);

  // -----------------------
  // COUNTDOWN TIMER + PRICE (FIXED)
  // -----------------------
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  // Toast only when we enter a new 24h cycle (not every render)
  const lastNotifiedCycleRef = useRef<number>(-1);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      const now = Date.now();

      const raw = now - GLOBAL_START;
      const cyclesPassed = raw <= 0 ? 0 : Math.floor(raw / TWENTY_FOUR_HOURS_MS);

      // Derive price from time (never drifts, never "only once")
      const price = Number(
        (INITIAL_PRICE * Math.pow(DAILY_MULT, cyclesPassed)).toFixed(4)
      );
      const next = Number((price * DAILY_MULT).toFixed(4));

      setCurrentPrice(price);
      setNextPrice(next);

      // Notify once per new cycle (skip on first paint)
      if (cyclesPassed !== lastNotifiedCycleRef.current) {
        if (lastNotifiedCycleRef.current !== -1) {
          toast.success(`💰 New presale price: $${price}`);
        }
        lastNotifiedCycleRef.current = cyclesPassed;
      }

      // deadline for the NEXT increase
      const nextDeadline = GLOBAL_START + (cyclesPassed + 1) * TWENTY_FOUR_HOURS_MS;
      const dist = nextDeadline - now;

      const days = Math.floor(dist / (1000 * 60 * 60 * 24));
      const hours = Math.floor((dist / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((dist / (1000 * 60)) % 60);
      const seconds = Math.floor((dist / 1000) % 60);

      setTimeLeft({
        days: String(Math.max(0, days)).padStart(2, "0"),
        hours: String(Math.max(0, hours)).padStart(2, "0"),
        minutes: String(Math.max(0, minutes)).padStart(2, "0"),
        seconds: String(Math.max(0, seconds)).padStart(2, "0"),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------
  // TOKEN CALC (main buy card)
  // -----------------------
  const recalcTokens = (
  usd: number,
  opts?: { bonusApplied?: boolean; referralUsed?: boolean; promoMultiplier?: number }
) => {
  let tokens = usd / currentPrice;

  // promo first (extra tokens)
  tokens *= opts?.promoMultiplier ?? promoMultiplier;

  // existing bonuses
  if (opts?.bonusApplied ?? bonusApplied) tokens *= 1.25;
  if (opts?.referralUsed ?? referralUsed) tokens *= 1.3;

  return tokens;
};


  // -----------------------
  // INPUT HANDLING (main card)
  // -----------------------
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (!val || isNaN(Number(val))) {
      setCoreAmount("0");
      setUsdValue(0);
      setIsMinAmountValid(false);
      return;
    }

    const amountNum = Number(val);
    let usd = 0;
    if (currency === "ETH") usd = amountNum * prices.eth;
    if (currency === "USDT") usd = amountNum * prices.usdt;
    if (currency === "USDC") usd = amountNum * prices.usdc;

    setUsdValue(usd);
    setIsMinAmountValid(usd >= 249); // logic unchanged, text still says $250
    const tokens = recalcTokens(usd);
    setCoreAmount(tokens.toFixed(2));
  };

  useEffect(() => {
    if (!amount) {
      setCoreAmount("0");
      setUsdValue(0);
      setIsMinAmountValid(false);
      return;
    }

    const amountNum = Number(amount);
    let usd = 0;
    if (currency === "ETH") usd = amountNum * prices.eth;
    if (currency === "USDT") usd = amountNum * prices.usdt;
    if (currency === "USDC") usd = amountNum * prices.usdc;

    setUsdValue(usd);
    setIsMinAmountValid(usd >= 249);
    const tokens = recalcTokens(usd);
    setCoreAmount(tokens.toFixed(2));
 }, [currency, prices, amount, bonusApplied, referralUsed, currentPrice, promoMultiplier]);



  // -----------------------
  // REFERRAL LINK DETECTION (URL ?ref=...)
  // -----------------------
  useEffect(() => {
    if (!isClient()) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
      setReferralUsed(true);
      setReferralBonus(0.3);
      toast.success("🎁 Referral link detected! You’ll get +30% OMIX.");
    }
  }, []);

  // -----------------------
  // ALLOWANCE CHECK
  // -----------------------
  useEffect(() => {
    if (!isClient() || !publicClient || !address) return;

    const checkAllowance = async () => {
      try {
        if (currency === "ETH") {
          setIsApproved(true);
          return;
        }

        const tokenAddress =
          currency === "USDT"
            ? (TOKEN_ADDRESSES.USDT as `0x${string}`)
            : (TOKEN_ADDRESSES.USDC as `0x${string}`);

        const decimals = 6;
        const allowance = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, PRESALE_ADDRESS as `0x${string}`],
        })) as bigint;

        if (!amount || Number(amount) === 0) {
          setIsApproved(false);
          return;
        }

        const parsedNeeded = parseUnits(amount, decimals);
        setIsApproved(allowance >= parsedNeeded);
      } catch (err) {
        console.warn("Failed to read allowance:", err);
        setIsApproved(false);
      }
    };

    setIsApproved(false);
    checkAllowance();
  }, [address, currency, amount, publicClient]);

  // -----------------------
  // BUY FUNCTION (ETH/USDT/USDC)
  // -----------------------
  const handleBuy = async () => {
    if (!amount) return;

    try {
      if (currency === "ETH") {
        toast.loading("🕓 Sending ETH transaction...", { id: "buy" });
        await writeContract({
          address: PRESALE_ADDRESS,
          abi: PresaleABI,
          functionName: "buyToken",
          args: ["0x0000000000000000000000000000000000000000", BigInt(0)],
          value: parseEther(amount),
        });
        toast.success("✅ ETH purchase sent!", { id: "buy" });
        return;
      }

      const tokenAddress =
        currency === "USDT"
          ? (TOKEN_ADDRESSES.USDT as `0x${string}`)
          : (TOKEN_ADDRESSES.USDC as `0x${string}`);
      const decimals = 6;
      const parsedAmount = parseUnits(amount, decimals);

      if (!publicClient) {
        console.warn("Public client not ready yet — skipping allowance check");
        return;
      }

      let currentAllowance = 0n;
      if (isClient() && publicClient) {
        currentAllowance = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, PRESALE_ADDRESS as `0x${string}`],
        })) as bigint;
      }

      if (currentAllowance < parsedAmount) {
        setIsApproving(true);
        toast.loading(`🕓 Approving ${currency}...`, { id: "approve" });

        if (currency === "USDT" && currentAllowance > 0n) {
          await writeContract({
            address: tokenAddress,
            abi: ERC20ABI,
            functionName: "approve",
            args: [PRESALE_ADDRESS, 0],
            gas: BigInt(100000),
          });
          await new Promise((r) => setTimeout(r, 3000));
        }

        await writeContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: "approve",
          args: [PRESALE_ADDRESS, parsedAmount],
        });

        toast.success(`✅ ${currency} approved!`, { id: "approve" });
        setIsApproved(true);
        setIsApproving(false);
        return;
      }

      toast.loading(`🛒 Buying with ${currency}...`, { id: "buy" });
      await writeContract({
        address: PRESALE_ADDRESS,
        abi: PresaleABI,
        functionName: "buyToken",
        args: [tokenAddress, parsedAmount],
      });

      toast.success(`🎉 Purchase sent with ${currency}!`, { id: "buy" });
    } catch (err) {
      console.error("Buy failed:", err);
      toast.error("❌ Transaction failed — check your gas or try again.");
    }
  };

  // -----------------------
  // REFERRAL GENERATION
  // -----------------------
  const [hasPurchased, setHasPurchased] = useState(false);

  const handleGenerateReferral = () => {
    if (!address) {
      toast.error("Connect wallet to generate referral link!");
      return;
    }
    const code = `https://weewux.com/?ref=${address}`;
    setGeneratedReferral(code);
    toast.success("Referral link generated!");
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(generatedReferral);
    toast.success("Referral link copied!");
  };

  // -----------------------
  // REFERRAL SUBMIT (FRONTEND ONLY, +30% DISPLAY)
  // -----------------------
  const handleSubmitReferral = () => {
    let code = referralCode.trim();

    if (!code) {
      toast.error("Please paste a referral link or wallet address.");
      return;
    }

    const match = code.match(/0x[a-fA-F0-9]{40}/);
    const addr = match ? match[0] : "";

    if (!addr) {
      toast.error("Invalid referral format. Paste a valid link or 0x address.");
      return;
    }

    if (!address) {
      toast.error("Connect your wallet to apply a referral.");
      return;
    }

    if (addr.toLowerCase() === address.toLowerCase()) {
      toast.error("You cannot use your own address as referral.");
      return;
    }

    setReferralUsed(true);
    setReferralBonus(0.3);
    setReferralCode(addr);
    setReferralPopupOpen(true);

    toast.success("Referral applied! You’ll get +30% more OMIX (displayed).");
  };

  // -----------------------
  // PURCHASE DETECTION (auto unlock referral generation)
  // -----------------------
  useEffect(() => {
    if (!isClient() || !publicClient || !address) return;

    const unwatch = publicClient.watchContractEvent({
      address: PRESALE_ADDRESS,
      abi: PresaleABI,
      eventName: "BuyToken",
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          const buyer = log?.args?.buyer?.toLowerCase?.();
          if (buyer && buyer === address.toLowerCase()) {
            setHasPurchased(true);
            toast.success("🎉 Purchase detected — referral unlocked!");
          }
        });
      },
    });

    return () => unwatch?.();
  }, [address, publicClient]);

  // -----------------------
  // MANUAL PAYMENT HELPERS
  // -----------------------
  const openManualPaymentModalFor = (m: "BTC" | "SOL" | "XRP") => {
    setManualPaymentMethod(m);
    setManualPaymentModalOpen(true);
    setManualDropdownOpen(false);
    setManualAmount("");
    setManualEmail("");
    setManualReceiveAddress(address ?? "");
  };

  const getManualEstimate = () => {
    if (!manualAmount || isNaN(Number(manualAmount))) return null;

    const coinAmount = Number(manualAmount);
    if (coinAmount <= 0) return null;

    let coinPrice = 0;
    if (manualPaymentMethod === "BTC") coinPrice = prices.btc;
    if (manualPaymentMethod === "ETH") coinPrice = prices.eth;
    if (manualPaymentMethod === "USDT") coinPrice = prices.usdt;
    if (manualPaymentMethod === "SOL") coinPrice = prices.sol;
    if (manualPaymentMethod === "XRP") coinPrice = prices.xrp;
    if (manualPaymentMethod === "CARD") return null; // no estimate for card

    if (!coinPrice || !currentPrice) return null;

    // USD value of the BTC/SOL/XRP/ETH/USDT the user pays
    const usdCost = coinAmount * coinPrice;

    // Reuse your main recalcTokens so manual flow behaves the same
    const tokens = recalcTokens(usdCost, {
      bonusApplied,
      referralUsed,
      promoMultiplier,
    });

    return { usdCost, coinAmount, tokens };
  };

  const manualEstimate = getManualEstimate();

  const handleManualSubmit = async () => {
    if (!manualAmount || isNaN(Number(manualAmount))) {
      toast.error("Please enter how much you want to pay.");
      return;
    }

    if (!manualEmail) {
      setManualEmailError("Please enter your email.");
      return;
    }

    const estimate = manualEstimate; // from getManualEstimate()

    if (!estimate) {
      toast.error("Could not calculate estimate. Please try again.");
      return;
    }

    if (estimate.usdCost < 250) {
      toast.error("Minimum manual purchase is $250.");
      return;
    }

    const receiveAddr = (manualReceiveAddress || address || "").trim();
if (!/^0x[a-fA-F0-9]{40}$/.test(receiveAddr)) {
  toast.error("Please enter a valid ERC20 address (0x...).");
  return;
}


    const payload = {
      method: manualPaymentMethod,
      // OMIX tokens the user should receive (with referral/bonus applied)
      omixAmount: estimate.tokens,
      // How much BTC/SOL/XRP/ETH/USDT they say they will pay
      estimatedCoinAmount: Number(manualAmount),
      // USD value of that payment
      estimatedUsdCost: estimate.usdCost,
      email: manualEmail,
      receiveAddress: receiveAddr,
      userWallet: address ?? null,
      referralCode: referralCode || null,
    };

    try {
      setIsSubmittingManual(true);

      const res = await fetch("/api/manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      toast.success(
        `Manual payment request submitted: ~${estimate.tokens.toFixed(
          2
        )} OMIX for ${Number(
          manualAmount
        )} ${manualPaymentMethod}. We’ll verify and contact you.`
      );

      setManualSuccessData({
  method: manualPaymentMethod,
  coinAmount: Number(manualAmount),
  usdCost: estimate.usdCost,
  tokens: estimate.tokens,
  email: manualEmail,
  receiveAddress: receiveAddr,
});

      setManualSuccessOpen(true);
      setManualPaymentModalOpen(false);

      setManualAmount("");
      setManualEmail("");
      setManualReceiveAddress("");
    } catch (err) {
      console.error("Manual payment submit failed", err);
      toast.error("Could not submit your request. Please try again.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const manualAddress =
    manualPaymentMethod === "CARD"
      ? ""
      : manualAddresses[manualPaymentMethod as Exclude<ManualMethod, "CARD">];

  const handleCopyManualAddress = () => {
    if (!manualAddress) return;
    navigator.clipboard.writeText(manualAddress);
    toast.success(`${manualPaymentMethod} address copied!`);
  };

  const getManualQrValue = () => {
    switch (manualPaymentMethod) {
      case "BTC":
        return manualAddress ? `bitcoin:${manualAddress}` : "";
      case "SOL":
        return manualAddress || "";
      case "XRP":
        return manualAddress || "";
      default:
        return manualAddress;
    }
  };

  const manualTheme =
    manualPaymentMethod === "CARD"
      ? MANUAL_THEMES.BTC
      : MANUAL_THEMES[manualPaymentMethod as Exclude<ManualMethod, "CARD">];

  const isManualMinValid = !manualEstimate || manualEstimate.usdCost >= 250;

  // -----------------------
  // UI
  // -----------------------
  return (
    <>
    
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1.1fr)] text-white">

        
        {/* LEFT: BUY CONSOLE */}
        <div
  id="buy"
  className="neon-card neon-card--soft p-4 md:p-5"
>
  

        <div className="pointer-events-none -mx-4 -mt-4 mb-2">
  <div className="h-[2px] bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.75),transparent)] opacity-70" />
  <div className="h-[10px] bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.18),transparent_70%)] blur-[2px]" />
</div>

          <div className="flex items-center justify-between mb-3">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Buy OMIX</h2>
              <p className="text-xs text-gray-400">
                Use ETH, USDT, USDC or manual payment methods to join the
                presale.
              </p>
            </div>
            
          </div>

          {/* Currency Selector */}
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              {
                symbol: "ETH",
                icon: <SiEthereum />,
              },
              {
                symbol: "USDT",
                icon: <SiTether />,
              },
              {
                symbol: "USDC",
                icon: (
                  <Image
                    src="/icons/usdc.svg"
                    alt="USDC"
                    width={16}
                    height={16}
                  />
                ),
              },
            ].map(({ symbol, icon }) => (
              <button
                key={symbol}
                onClick={() => setCurrency(symbol)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  currency === symbol
                    ? "bg-lime-400/10 border-lime-400 text-lime-200"
                    : "bg-gray-900/70 border-gray-700 text-gray-200 hover:bg-gray-800"
                }`}
              >
                {icon}
                {symbol}
              </button>
            ))}

            {/* Manual payment shortcut */}
            <button
              onClick={() => openManualPaymentModalFor("BTC")}
              className="ml-auto text-[11px] underline text-cyan-300 hover:text-cyan-200"
            >
              Manual payment options
            </button>
          </div>

          {/* Inputs */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <label className="block text-xs mb-1 text-gray-400">
                Amount you pay ({currency})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full rounded-lg bg-gray-950/80 border border-gray-700 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-lime-400 outline-none"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-8 text-[11px] text-gray-500">
                {currency}
              </span>
              {usdValue > 0 && (
                <p className="mt-1 text-[11px] text-gray-400">
                  ≈{" "}
                  <span className="text-gray-200">
                    ${usdValue.toFixed(2)} USD
                  </span>
                </p>
              )}
              {amount && !isMinAmountValid && (
                <p className="text-yellow-400 text-[11px] mt-1">
                  Minimum purchase $250
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-400">
                OMIX you receive
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={coreAmount}
                  readOnly
                  className="w-full rounded-lg bg-gray-950/80 border border-gray-700 px-3 py-2.5 text-sm text-white"
                />
              </div>
              {referralUsed && (
                <p className="text-[11px] text-green-400 mt-1">
                  🎉 Referral bonus active: +30% OMIX displayed here. Bonus
                  tokens will be sent after manual verification.
                </p>
              )}
              {promoActive && (
  <p className="text-[11px] text-emerald-300">
    ✅ Promo applied – this OMIX amount already includes your +{promoDiscountPct}%.
  </p>
)}


            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full my-4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="w-full bg-lime-400 hover:bg-lime-300 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            ) : (
              <button
                onClick={handleBuy}
                disabled={isPending || isApproving || !isMinAmountValid}
                className={`w-full font-semibold py-2.5 rounded-lg text-sm transition-all ${
                  isPending || isApproving
                    ? "bg-gray-600 cursor-wait text-gray-200"
                    : isMinAmountValid
                    ? "bg-lime-400 hover:bg-lime-300 text-black"
                    : "bg-lime-400/40 text-black/60 cursor-not-allowed"
                }`}
              >
                {isPending
                  ? "Processing..."
                  : isApproving
                  ? `Approving ${currency}...`
                  : currency === "ETH"
                  ? "Buy with ETH"
                  : !isApproved
                  ? `Approve ${currency}`
                  : `Buy with ${currency}`}
              </button>
            )}
            <p className="mt-2 text-[11px] text-gray-400 text-center">
  Transactions are executed on-chain. No custody. No approvals beyond purchase.
</p>

              
            <div className="flex justify-between text-[11px] text-gray-400 mt-2">
              <a
                href="https://weewux.com/howtobuy"
                className="hover:text-lime-300"
                target="_blank"
                rel="noreferrer"
              >
                How to Buy
              </a>
              <a
                href="https://weewux.com/referral"
                className="hover:text-lime-300"
                target="_blank"
                rel="noreferrer"
              >
                How referral works
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: METRICS + REFERRAL CENTER */}
        <div className="space-y-4">
          {/* Presale Metrics */}
          <div className="neon-card neon-card--hero p-4 md:p-5">

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  Presale status
                </p>
                <p className="text-sm text-gray-300">
                  Live price evolution every 24 hours
                </p>
              </div>
              <span className="px-2 py-1 rounded-full text-[11px] bg-lime-400/10 text-lime-300 border border-lime-400/40">
                Live
              </span>
            </div>

            {/* Countdown */}
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {["Days", "Hours", "Minutes", "Seconds"].map((label, i) => {
                const value = Object.values(timeLeft)[i];
                return (
                  <div
                    key={label}
                    className="rounded-lg bg-gray-950/80 border border-gray-800 py-1.5"
                  >
                    <div className="text-sm font-semibold">{value}</div>
                    <div className="text-[10px] text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Price Info */}
            <div className="flex items-center justify-between text-xs mb-3">
              <div>
                <p className="text-gray-400">Current price</p>
                <p className="text-sm font-semibold text-lime-300">
                  ${currentPrice.toFixed(4)} / OMIX
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400">Next price</p>
                <p className="text-sm font-semibold text-lime-400">
                  ${nextPrice.toFixed(4)} / OMIX
                </p>
                <p className="text-[10px] text-gray-500">
                  Auto-increase every 24h
                </p>
              </div>
            </div>

            {/* Progress (still static 67% placeholder for now) */}
            <div className="mt-1">
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Presale progress</span>
                <span className="text-cyan-300 font-semibold">{progressPercent}% sold
            </span>
              </div>
              <div className="relative w-full bg-gray-900/80 rounded-full h-2.5 overflow-hidden">
                <motion.div
  initial={{ width: "0%" }}
  animate={{ width: `${progressPercent}%` }}
  transition={{ duration: 1.8, ease: "easeInOut" }}
  className="h-2.5 rounded-full bg-gradient-to-r from-lime-400 via-cyan-400 to-purple-500"
/>
              </div>
              
            </div>
          </div>

          {/* Referral Center */}
          <div className="neon-card neon-card--soft p-4 md:p-5">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Referral Center</h3>
                <p className="text-[11px] text-gray-400">
                  Apply a referral or generate your own link after purchase.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200">
                +30% OMIX bonus
              </span>
            </div>

            {/* Apply a referral */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-lime-300">
                Have a referral?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Paste referral link or wallet address"
                  className="flex-1 rounded-md bg-gray-950/80 border border-gray-700 px-3 py-2 text-xs md:text-sm text-white focus:ring-2 focus:ring-lime-400 outline-none"
                />
                <button
                  onClick={handleSubmitReferral}
                  className="w-full sm:w-auto px-3 md:px-4 py-2 rounded-md bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs md:text-sm"
                >
                  Submit
                </button>
              </div>
            </div>

            {/* Generated referral link */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Your referral link
              </label>
              <div className="flex flex-col sm:flex-row gap-2">

                <input
                  type="text"
                  readOnly
                  value={generatedReferral}
                  placeholder={
                    hasPurchased
                      ? "Generate your referral link"
                      : "Make a purchase to unlock your referral link"
                  }
                  className="flex-1 rounded-md bg-gray-950/80 border border-gray-700 px-3 py-2 text-xs md:text-sm text-white"
                />
                <button
                  onClick={() => {
                    if (!hasPurchased) {
                      setShowReferralNotice(true);
                      setTimeout(() => setShowReferralNotice(false), 4000);
                      return;
                    }
                    generatedReferral
                      ? handleCopyReferral()
                      : handleGenerateReferral();
                  }}
                  className="w-full sm:w-auto px-3 md:px-4 py-2 rounded-md bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs md:text-sm"
                >
                  {generatedReferral ? "Copy" : "Generate"}
                </button>
              </div>
              {showReferralNotice && (
                <p className="mt-1 text-[11px] text-yellow-400">
                  ⚠️ You need to purchase OMIX before generating a referral
                  link.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Referral Applied Popup */}
      {referralPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#050712] via-purple-900/40 to-black/80 border border-lime-400/50 shadow-2xl p-4 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 text-black text-xl">
                🎉
              </div>
              <div>
                <h3 className="text-lg font-semibold text-lime-300">
                  Referral Applied!
                </h3>
                <p className="text-sm text-gray-100">
                  You’ve unlocked{" "}
                  <span className="font-bold">+30% more OMIX</span> on this
                  purchase. Bonus tokens will be sent after manual verification.
                </p>
              </div>
            </div>

            <button
              onClick={() => setReferralPopupOpen(false)}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-lime-400 to-lime-500 py-2 text-sm font-semibold text-black hover:from-lime-500 hover:to-lime-400"
            >
              Awesome, got it!
            </button>
          </motion.div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {manualPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-3 sm:p-6 overflow-y-auto hide-scrollbar">


          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-md rounded-2xl bg-gradient-to-br from-[#050712] ${manualTheme.bgVia} to-black/80 border ${manualTheme.border} shadow-2xl p-3 sm:p-4 md:p-5 text-white max-h-[calc(100dvh-1.5rem)] overflow-y-auto hide-scrollbar`}
          >
            {/* Close button */}
            <button
              onClick={() => setManualPaymentModalOpen(false)}
              className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-gray-200 hover:text-white hover:bg-black/70 text-2xl"

            >
              ×
            </button>

            <h3 className={`text-lg font-semibold mb-1 ${manualTheme.accentText}`}>
              Pay with {manualPaymentMethod}
            </h3>
            <p className="text-xs text-gray-300 mb-4">
              Manual {manualPaymentMethod} payment from any wallet or exchange.
            </p>

            {/* Method selector */}
            {/* Row 1: BTC / USDT / ETH */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(["BTC", "USDT", "ETH"] as const).map((m) => {
                const isActive = manualPaymentMethod === m;
                const icon =
                  m === "BTC" ? (
                    <SiBitcoin className="text-sm" />
                  ) : m === "USDT" ? (
                    <SiTether className="text-sm" />
                  ) : (
                    <SiEthereum className="text-sm" />
                  );

                return (
                  <button
                    key={m}
                    onClick={() => setManualPaymentMethod(m)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center justify-center gap-1 min-w-0 ${
                      isActive
                        ? METHOD_PILL_ACTIVE[m]
                        : "bg-gray-900/70 border-gray-700 text-gray-200 hover:bg-gray-800/70"
                    }`}
                  >
                    {icon}
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>

            {/* Row 2: SOL / XRP / CARD */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["SOL", "XRP", "CARD"] as const).map((m) => {
                const isActive = manualPaymentMethod === m;
                const icon =
                  m === "SOL" ? (
                    <SiSolana className="text-sm" />
                  ) : m === "XRP" ? (
                    <SiXrp className="text-sm" />
                  ) : (
                    <FaRegCreditCard className="text-sm" />
                  );

                const handleClick = () => {
                  if (m === "CARD") {
                    window.open(
                      "https://weewux.com/how-to-buy-with-card",
                      "_blank"
                    );
                    return;
                  }
                  setManualPaymentMethod(m);
                };

                return (
                  <button
                    key={m}
                    onClick={handleClick}
                    className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center justify-center gap-1 min-w-0 ${
                      isActive
                        ? METHOD_PILL_ACTIVE[m]
                        : "bg-gray-900/70 border-gray-700 text-gray-200 hover:bg-gray-800/70"
                    }`}
                  >
                    {icon}
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>

            {/* QR + Address */}
            <div className="flex flex-col items-center gap-1.5 mb-3">
              <div className="bg-white p-2 rounded-lg">
                <QRCode value={getManualQrValue() || " "} size={110} />
              </div>
              <p className="text-[10px] text-gray-300">
                Scan this QR code in your {manualPaymentMethod} wallet.
              </p>

              <div className="w-full mt-2">
                <label className="block text-xs text-gray-300 mb-1">
                  {manualPaymentMethod} address
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={manualAddress}
                    className="flex-1 min-w-0 rounded-md bg-gray-900/80 border border-gray-700 px-3 py-2 text-xs text-gray-100 truncate"
                  />
                  <button
                    onClick={handleCopyManualAddress}
                    className="shrink-0 whitespace-nowrap px-3 py-2 rounded-md bg-white/90 text-black text-xs font-semibold hover:bg-white"

                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-1.5 mb-2">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Amount you pay ({manualPaymentMethod})
                </label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder={
                    manualPaymentMethod === "BTC"
                      ? "e.g. 0.01"
                      : manualPaymentMethod === "ETH"
                      ? "e.g. 0.1"
                      : manualPaymentMethod === "SOL"
                      ? "e.g. 5"
                      : manualPaymentMethod === "USDT"
                      ? "e.g. 500"
                      : manualPaymentMethod === "XRP"
                      ? "e.g. 1000"
                      : "0.0"
                  }
                  className={`w-full rounded-md bg-gray-900/80 border border-gray-700 px-3 py-2 text-sm text-white focus:ring-2 ${manualTheme.ring}`}
                />

                {manualEstimate && (
                  <div className="mt-1 text-[11px] text-gray-300 space-y-0.5">
                    <p>
                      Tokens you receive:{" "}
                      <span className="font-semibold">
                        {manualEstimate.tokens.toFixed(2)} OMIX
                      </span>
                      {referralUsed && (
                        <span className="text-[10px] text-lime-300 ml-1">
                          (includes referral bonus)
                        </span>
                      )}
                      {promoActive && (
                    <span className="text-[10px] text-amber-200 ml-1">
                    (+{promoDiscountPct}% promo)
                      </span>
                      )}


                    </p>
                    <p>
                      Approx. USD value:{" "}
                      <span className="text-gray-200">
                        ~${manualEstimate.usdCost.toFixed(2)}
                      </span>
                    </p>
                    {!isManualMinValid && (
                      <p className="text-[11px] text-yellow-400 mt-1">
                        Minimum purchase $250
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Your email
                </label>

                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    if (manualEmailError) setManualEmailError("");
                  }}
                  placeholder="you@example.com"
                  className={`w-full rounded-md px-3 py-2 text-sm text-white focus:ring-2 ${manualTheme.ring} bg-gray-900/80 border ${
                    manualEmailError ? "border-red-500" : "border-gray-700"
                  }`}
                />

                {manualEmailError && (
                  <p className="text-[11px] text-red-400 mt-1 animate-pulse">
                    {manualEmailError}
                  </p>
                )}
              </div>

              <div>
  <label className="block text-xs text-gray-300 mb-1">
    ERC20 receive address
  </label>
  <input
    type="text"
    value={manualReceiveAddress}
    onChange={(e) => setManualReceiveAddress(e.target.value)}
    placeholder="Your OMIX tokens will be sent to this address (0x...)"
    className={`w-full rounded-md bg-gray-900/80 border border-gray-700 px-3 py-2 text-xs text-white focus:ring-2 ${manualTheme.ring}`}
  />
  <p className=" text-[10px] text-gray-400 mt-1">
  Make sure this is an EVM address you control (Ethereum / ERC20 compatible).
</p>

  
</div>

            </div>

            <button
              onClick={handleManualSubmit}
              disabled={isSubmittingManual || !manualEstimate || !isManualMinValid}
              className={`w-full rounded-lg bg-gradient-to-r ${manualTheme.buttonGradient} py-2.5 text-sm font-semibold text-black ${
                isSubmittingManual || !isManualMinValid
                  ? "opacity-70 cursor-not-allowed"
                  : ""
              }`}
            >
              {isSubmittingManual ? "Submitting..." : "I have sent the payment"}
            </button>

            <p className="mt-2 text-[10px] text-gray-400 text-center">
              We’ll verify your transaction on-chain and contact you at the
              email you provided. OMIX will be sent manually after confirmation.
            </p>
          </motion.div>
        </div>
      )}

      {/* Manual Payment Success Popup */}
      {manualSuccessOpen && manualSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#050712] via-emerald-900/40 to-black/80 border border-emerald-400/60 shadow-2xl p-5 text-white"
          >
            {/* Close button */}
            <button
              onClick={() => setManualSuccessOpen(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black text-xl">
                🎉
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-300">
                  Payment Submitted!
                </h3>
                <p className="text-sm text-gray-100">
                  Our team will verify your transaction and email you shortly.
                  Your OMIX tokens will be sent after confirmation.
                </p>
              </div>
            </div>

            <div className="mt-2 text-xs space-y-1.5 bg-black/40 border border-emerald-400/40 rounded-lg p-3">
              <p>
                <span className="text-gray-400">You pay:</span>{" "}
                <span className="font-semibold">
                  {manualSuccessData.coinAmount} {manualSuccessData.method}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Estimated value:</span>{" "}
                <span className="font-semibold">
                  ~${manualSuccessData.usdCost.toFixed(2)}
                </span>
              </p>
              <p>
                <span className="text-gray-400">OMIX you’ll receive:</span>{" "}
                <span className="font-semibold">
                  {manualSuccessData.tokens.toFixed(2)} OMIX
                </span>
              </p>
              <p>
                <span className="text-gray-400">Confirmation email:</span>{" "}
                <span className="font-semibold break-all">
                  {manualSuccessData.email}
                </span>
              </p>
              <p>
  <span className="text-gray-400">Receive address:</span>{" "}
  <span className="font-semibold break-all">
    {manualSuccessData.receiveAddress}
  </span>
</p>

              {referralUsed && (
                <p className="text-[11px] text-emerald-300">
                  ✅ Referral bonus applied – this OMIX amount already includes
                  your extra tokens.
                </p>
              )}
                {promoActive && (
  <p className="text-[11px] text-emerald-300">
    ✅ Promo applied – this OMIX amount already includes your +{promoDiscountPct}%.
  </p>
)}


            </div>

            <button
              onClick={() => setManualSuccessOpen(false)}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 py-2.5 text-sm font-semibold text-black hover:from-emerald-500 hover:to-emerald-400"
            >
              Got it, thanks!
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}

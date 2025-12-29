"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";

import ERC20ABI from "../../abi/ERC20.json";
import StakingABI from "../../abi/omixStaking.json";

const STAKING_ADDRESS = "0x6e2d536e07a9cEbeE39cF07Ec7055898c2a65558" as const;
const OMIX_TOKEN = "0xb9A091213246Ee02c8BFF4e86D84b0C3536d0631" as const;

// ✅ MUST match your deployed contract ABI:
const STAKE_FN_NAME = "stakeOMIX";

type LockOption = { label: string; seconds: bigint; aprLabel: string };
const LOCKS: LockOption[] = [
  { label: "Flex (no lock)", seconds: 0n, aprLabel: "8% APR" },
  { label: "30 days", seconds: 30n * 24n * 60n * 60n, aprLabel: "20% " },
  { label: "90 days", seconds: 90n * 24n * 60n * 60n, aprLabel: "40% " },
  { label: "365 days", seconds: 365n * 24n * 60n * 60n, aprLabel: "65% " },
  { label: "730 days", seconds: 730n * 24n * 60n * 60n, aprLabel: "95% " },
];

type StakeRow = {
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  rewardRate: bigint;
  withdrawn: boolean;
};

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function fmtDate(ts: bigint) {
  const n = Number(ts) * 1000;
  if (!n) return "-";
  return new Date(n).toLocaleString();
}

export default function StakingPanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const { writeContractAsync } = useWriteContract();

  const [decimals, setDecimals] = useState<number>(18);
  const [amount, setAmount] = useState<string>("");
  const [lock, setLock] = useState<bigint>(LOCKS[0].seconds);

  const [allowanceOk, setAllowanceOk] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<bigint>(0n);

  const [stakes, setStakes] = useState<StakeRow[]>([]);
  const [loadingStakes, setLoadingStakes] = useState(false);

  // tx hashes so we can wait for mining
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [stakeHash, setStakeHash] = useState<`0x${string}` | undefined>();

  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveHash,
    confirmations: 1,
    query: { enabled: !!approveHash },
  });

  const stakeReceipt = useWaitForTransactionReceipt({
    hash: stakeHash,
    confirmations: 1,
    query: { enabled: !!stakeHash },
  });

  const parsedAmount = useMemo(() => {
    if (!amount || Number(amount) <= 0) return 0n;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  // load token decimals
  useEffect(() => {
    if (!publicClient) return;
    (async () => {
      try {
        const d = (await publicClient.readContract({
          address: OMIX_TOKEN,
          abi: ERC20ABI,
          functionName: "decimals",
        })) as number;
        setDecimals(Number(d ?? 18));
      } catch {
        setDecimals(18);
      }
    })();
  }, [publicClient]);

  const refreshAllowance = async () => {
    if (!publicClient || !address) return;
    try {
      const a = (await publicClient.readContract({
        address: OMIX_TOKEN,
        abi: ERC20ABI,
        functionName: "allowance",
        args: [address, STAKING_ADDRESS],
      })) as bigint;
      setAllowance(a ?? 0n);
      setAllowanceOk(parsedAmount > 0n && (a ?? 0n) >= parsedAmount);
    } catch {
      setAllowance(0n);
      setAllowanceOk(false);
    }
  };

  const refreshStakes = async () => {
    if (!publicClient || !address) return;
    setLoadingStakes(true);
    try {
      const rows = (await publicClient.readContract({
        address: STAKING_ADDRESS,
        abi: StakingABI,
        functionName: "getUserStakes",
        args: [address],
      })) as StakeRow[];
      setStakes(rows ?? []);
    } catch (e) {
      console.warn("getUserStakes failed", e);
      setStakes([]);
    } finally {
      setLoadingStakes(false);
    }
  };

  // initial loads
  useEffect(() => {
    if (!isConnected) return;
    refreshStakes();
    refreshAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, publicClient]);

  // allowance should re-check when amount changes
  useEffect(() => {
    refreshAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAmount]);

  // when approve tx mines -> re-check allowance -> enable stake
  useEffect(() => {
    if (!approveReceipt.isSuccess) return;
    toast.success("Approval confirmed on-chain!", { id: "approve" });
    setApproveHash(undefined);
    refreshAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt.isSuccess]);

  // when stake tx mines -> refresh stakes
  useEffect(() => {
    if (!stakeReceipt.isSuccess) return;
    toast.success("Stake confirmed on-chain!", { id: "stake" });
    setStakeHash(undefined);
    setAmount("");
    refreshStakes();
    refreshAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeReceipt.isSuccess]);

  const handleApprove = async () => {
    if (!parsedAmount) return toast.error("Enter amount first.");
    if (!isConnected || !address) return toast.error("Connect wallet first.");
    try {
      toast.loading("Approving OMIX…", { id: "approve" });
      const hash = await writeContractAsync({
        address: OMIX_TOKEN,
        abi: ERC20ABI,
        functionName: "approve",
        args: [STAKING_ADDRESS, parsedAmount],
      });
      setApproveHash(hash);
      // DO NOT setAllowanceOk(true) here — wait for confirmation
    } catch (e) {
      console.error(e);
      toast.error("Approve failed.", { id: "approve" });
      setApproveHash(undefined);
    }
  };

  const handleStake = async () => {
    if (!parsedAmount) return toast.error("Enter amount first.");
    if (!allowanceOk) return toast.error("Approve OMIX first.");
    if (!isConnected || !address) return toast.error("Connect wallet first.");

    try {
      toast.loading("Staking…", { id: "stake" });

      const hash = await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: StakingABI,
        
        functionName: STAKE_FN_NAME,
        args: [parsedAmount, lock],
      });

      setStakeHash(hash);
    } catch (e) {
      console.error(e);
      toast.error("Stake failed.", { id: "stake" });
      setStakeHash(undefined);
    }
  };

  const handleWithdraw = async (index: number) => {
    try {
      toast.loading("Withdrawing…", { id: `w-${index}` });
      await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: StakingABI,
        functionName: "withdraw",
        args: [BigInt(index)],
      });
      toast.success("Withdraw submitted!", { id: `w-${index}` });
      setTimeout(refreshStakes, 2000);
    } catch (e) {
      console.error(e);
      toast.error("Withdraw failed.", { id: `w-${index}` });
    }
  };

  const handleReinvest = async (index: number) => {
    try {
      toast.loading("Reinvesting…", { id: `r-${index}` });
      await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: StakingABI,
        functionName: "reinvestReward",
        args: [BigInt(index)],
      });
      toast.success("Reinvest submitted!", { id: `r-${index}` });
      setTimeout(refreshStakes, 2000);
    } catch (e) {
      console.error(e);
      toast.error("Reinvest failed.", { id: `r-${index}` });
    }
  };

  const isApprovingOnChain = approveReceipt.isLoading || !!approveHash;
  const isStakingOnChain = stakeReceipt.isLoading || !!stakeHash;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 shadow-[0_0_0_1px_rgba(163,230,53,0.08)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
            Staking
          </p>
          <h2 className="text-lg font-semibold text-white">
            Stake OMIX and track positions
          </h2>
          <p className="text-sm text-gray-400">
            Contract:{" "}
            <span className="text-gray-200">{shortAddr(STAKING_ADDRESS)}</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Allowance:{" "}
            <span className="text-gray-300">
              {Number(formatUnits(allowance, decimals)).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{" "}
              OMIX
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            refreshStakes();
            refreshAllowance();
          }}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-gray-200 hover:bg-white/10"
        >
          {loadingStakes ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stake form */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr,0.8fr]">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Amount (OMIX)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="0.0"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Lock period</label>
          <select
  value={lock.toString()}
  onChange={(e) => setLock(BigInt(e.target.value))}
  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white
             focus:outline-none focus:ring-2 focus:ring-lime-400/30
             [color-scheme:dark]"
>
  {LOCKS.map((l) => (
    <option
      key={l.label}
      value={l.seconds.toString()}
      className="bg-black text-white"
    >
      {l.label} — {l.aprLabel}
    </option>
  ))}
</select>

        </div>

        <div className="flex items-end gap-2">
          {!isConnected ? (
            <div className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
              Connect wallet to stake
            </div>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={
                  !parsedAmount ||
                  allowanceOk ||
                  isApprovingOnChain ||
                  isStakingOnChain
                }
                className={`w-full rounded-xl px-3 py-2 text-sm font-semibold border ${
                  allowanceOk
                    ? "border-lime-400/30 bg-lime-400/10 text-lime-300 cursor-not-allowed"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {allowanceOk
                  ? "Approved"
                  : isApprovingOnChain
                  ? "Processing…"
                  : "Approve"}
              </button>

              <button
                onClick={handleStake}
                disabled={
                  !parsedAmount ||
                  !allowanceOk ||
                  isApprovingOnChain ||
                  isStakingOnChain
                }
                className="w-full rounded-xl px-3 py-2 text-sm font-semibold bg-gradient-to-r from-lime-400 to-lime-500 text-black hover:from-lime-500 hover:to-lime-400 disabled:opacity-60"
              >
                {isStakingOnChain ? "Processing…" : "Stake"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stakes list */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Your stakes</h3>
          <span className="text-xs text-gray-400">{stakes.length} total</span>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1.2fr,1fr,1fr,0.8fr,1fr] gap-0 bg-white/5 px-3 py-2 text-xs text-gray-300">
            <div>Amount</div>
            <div>Start</div>
            <div>End</div>
            <div>Rate</div>
            <div className="text-right">Actions</div>
          </div>

          {stakes.length === 0 ? (
            <div className="px-3 py-6 text-sm text-gray-400 bg-black/20">
              No stakes yet.
            </div>
          ) : (
            stakes.map((s, idx) => {
              const amountFmt = Number(formatUnits(s.amount, decimals)).toLocaleString(
                undefined,
                { maximumFractionDigits: 4 }
              );

              const ended =
                Number(s.endTime) > 0 && Date.now() / 1000 >= Number(s.endTime);
              const isWithdrawn = s.withdrawn;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-[1.2fr,1fr,1fr,0.8fr,1fr] gap-0 px-3 py-3 text-sm bg-black/20 border-t border-white/5"
                >
                  <div className="text-white">{amountFmt} OMIX</div>
                  <div className="text-gray-300 text-xs">
                    {fmtDate(s.startTime)}
                  </div>
                  <div className="text-gray-300 text-xs">
                    {fmtDate(s.endTime)}
                  </div>
                  <div className="text-lime-300 text-xs">
                    {s.rewardRate.toString()}%
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleWithdraw(idx)}
                      disabled={isWithdrawn}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        isWithdrawn
                          ? "border-white/10 bg-white/5 text-gray-500 cursor-not-allowed"
                          : "border-lime-400/20 bg-lime-400/10 text-lime-300 hover:bg-lime-400/15"
                      }`}
                    >
                      {isWithdrawn ? "Withdrawn" : "Withdraw"}
                    </button>

                    <button
                      onClick={() => handleReinvest(idx)}
                      disabled={!ended || isWithdrawn}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        !ended || isWithdrawn
                          ? "border-white/10 bg-white/5 text-gray-500 cursor-not-allowed"
                          : "border-purple-400/20 bg-purple-400/10 text-purple-200 hover:bg-purple-400/15"
                      }`}
                    >
                      Reinvest
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Note: Reinvest only works after end time (for locked stakes).
        </p>
      </div>
    </div>
  );
}

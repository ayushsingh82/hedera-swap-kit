"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWriteContract } from "wagmi";
import { TokenIcon } from "~~/components/swap";
import { DCA_PLANS_KEY, useDcaPlans, useScheduledSwap, useSwapNetwork, useTokenList } from "~~/hooks/swap";
import { scheduledSwapAbi } from "~~/utils/swap/abis";
import { PlanView, formatInterval, planStatus, scheduleId } from "~~/utils/swap/dca";
import { formatAmount } from "~~/utils/swap/math";
import { HBAR } from "~~/utils/swap/tokens";

const BADGE = { active: "badge-success", paused: "badge-warning", ended: "badge-ghost" } as const;
const ACTION_GAS = 2_500_000n;

/** The connected account's auto-buy plans, with progress, the scheduled run on Hashscan, and cancel and resume. */
export const DcaPlans = () => {
  const network = useSwapNetwork();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { address: dca } = useScheduledSwap();
  const { tokens } = useTokenList();
  const { data: plans, isLoading, error } = useDcaPlans();
  const [pending, setPending] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const byAddress = useMemo(() => new Map(tokens.map(t => [t.address.toLowerCase(), t])), [tokens]);

  const act = async (plan: PlanView, functionName: "cancel" | "resume") => {
    if (!dca || !publicClient) return;
    setActionError(undefined);
    setPending(`${functionName}-${plan.id}`);
    try {
      const hash = await writeContractAsync({
        address: dca,
        abi: scheduledSwapAbi,
        functionName,
        args: [plan.id],
        gas: ACTION_GAS,
        chainId: network.chainId,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted");
      await queryClient.invalidateQueries({ queryKey: DCA_PLANS_KEY });
    } catch (e) {
      setActionError(e instanceof Error ? e.message.split("\n")[0] : "The action failed");
    } finally {
      setPending(undefined);
    }
  };

  if (isLoading) return <span className="loading loading-spinner mx-auto block" />;
  if (error) {
    return (
      <p role="alert" className="text-center text-sm text-error">
        Could not load your plans: {error.message}
      </p>
    );
  }
  if (!plans?.length)
    return <p className="text-center text-sm opacity-60">No auto-buys yet. Start one to see it here.</p>;

  return (
    <ul className="space-y-3">
      {actionError && (
        <li role="alert" className="alert alert-error text-sm">
          {actionError}
        </li>
      )}
      {plans.map(plan => {
        const status = planStatus(plan);
        const total = Number(plan.runsDone + plan.runsLeft);
        const done = Number(plan.runsDone);
        const out = byAddress.get(`0x${plan.path.slice(-40)}`.toLowerCase());
        const schedule = scheduleId(plan.schedule);
        return (
          <li key={plan.id.toString()} className="rounded-2xl border border-base-300 bg-base-100 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold">
                {out && <TokenIcon token={out} size={22} />}
                {formatAmount(plan.amountPerRun, HBAR.decimals)} HBAR into {out?.symbol ?? "a token"}
              </span>
              <span className={`badge ${BADGE[status]}`}>{status}</span>
            </div>
            <p className="mt-1 opacity-70">
              {formatInterval(plan.interval)}, {done} of {total} runs done, {formatAmount(plan.budget, HBAR.decimals)}{" "}
              HBAR left
            </p>
            <progress className="progress progress-primary mt-2 w-full" value={done} max={Math.max(total, 1)} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {schedule && (
                <a
                  className="link text-xs"
                  href={`${network.hashscan}/schedule/${schedule}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Next run on Hashscan ({schedule})
                </a>
              )}
              <span className="grow" />
              {status === "paused" && (
                <button
                  type="button"
                  className="btn btn-sm btn-warning"
                  disabled={!!pending}
                  onClick={() => act(plan, "resume")}
                >
                  {pending === `resume-${plan.id}` && <span className="loading loading-spinner loading-xs" />}
                  Resume
                </button>
              )}
              {status !== "ended" && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={!!pending}
                  onClick={() => act(plan, "cancel")}
                >
                  {pending === `cancel-${plan.id}` && <span className="loading loading-spinner loading-xs" />}
                  Cancel and refund
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

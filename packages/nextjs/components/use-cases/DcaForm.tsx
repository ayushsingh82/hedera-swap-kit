"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { AssociateButton, TokenSelect } from "~~/components/swap";
import {
  DCA_PLANS_KEY,
  useAssociation,
  useQuote,
  useRoute,
  useScheduledSwap,
  useSwapNetwork,
  useTokenBalances,
  useTokenList,
} from "~~/hooks/swap";
import { scheduledSwapAbi } from "~~/utils/swap/abis";
import { hashscanTx, idToEvmAddress } from "~~/utils/swap/config";
import { DCA_CREATE_GAS, INTERVALS, dcaCost } from "~~/utils/swap/dca";
import { WEIBAR_PER_TINYBAR, applySlippage, formatAmount, parseAmount } from "~~/utils/swap/math";
import { encodePath } from "~~/utils/swap/route";
import { HBAR, SwapToken } from "~~/utils/swap/tokens";

const MAX_RUNS = 30;
/** HBAR kept back for the transaction that creates the plan. */
const CREATE_GAS_RESERVE = 200_000_000n;
const SLIPPAGE_BPS = 500;

type Status =
  { kind: "idle" } | { kind: "busy"; text: string } | { kind: "done"; hash: string } | { kind: "error"; text: string };

/** Starts a recurring HBAR to token purchase that the Hedera Schedule Service runs, with no bot. */
export const DcaForm = () => {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { tokens } = useTokenList();
  const { balanceOf, refetch: refetchBalances } = useTokenBalances();
  const { address: dca, feePerRun, isDeployed } = useScheduledSwap();

  const [tokenOut, setTokenOut] = useState<SwapToken>();
  const [amount, setAmount] = useState("1");
  const [interval, setInterval] = useState<number>(INTERVALS[1].seconds);
  const [runs, setRuns] = useState(3);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!tokens.length) return;
    setTokenOut(current => current ?? tokens.find(t => t.symbol === "SAUCE") ?? tokens[1]);
  }, [tokens]);

  const amountPerRun = parseAmount(amount, HBAR.decimals);
  const { route } = useRoute(HBAR, tokenOut);
  const { data: quote } = useQuote(route, amountPerRun);
  const wallet = useAssociation(tokenOut, "wallet");

  const minOut = quote ? applySlippage(quote.amountOut, SLIPPAGE_BPS) : undefined;
  const cost = amountPerRun ? dcaCost(amountPerRun, runs, feePerRun) : undefined;
  const balance = balanceOf(HBAR);
  const needed = cost ? cost.total + CREATE_GAS_RESERVE : undefined;
  const busy = status.kind === "busy";

  const blocker = (() => {
    if (!isDeployed) return "ScheduledSwap is not deployed on this network";
    if (!tokenOut) return "Select a token";
    if (!amountPerRun) return "Enter the HBAR to spend per run";
    if (!route) return "No route with liquidity";
    if (!quote) return "Getting a quote…";
    if (wallet.isAssociated === false) return `Associate ${tokenOut.symbol} first`;
    if (balance !== undefined && needed !== undefined && balance < needed) return "Not enough HBAR";
    return undefined;
  })();

  const start = async () => {
    if (!dca || !account || !publicClient || !route || !tokenOut || !amountPerRun || minOut === undefined || !cost) {
      return;
    }
    try {
      setStatus({ kind: "busy", text: "Confirm in your wallet…" });
      const hash = await writeContractAsync({
        address: dca,
        abi: scheduledSwapAbi,
        functionName: "create",
        args: [
          encodePath(route.tokens.map(idToEvmAddress), route.fees),
          account,
          amountPerRun,
          minOut,
          BigInt(interval),
          BigInt(runs),
        ],
        value: cost.total * WEIBAR_PER_TINYBAR,
        gas: DCA_CREATE_GAS,
        chainId: network.chainId,
      });
      setStatus({ kind: "busy", text: "Scheduling the first run…" });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted");
      setStatus({ kind: "done", hash });
      refetchBalances();
      queryClient.invalidateQueries({ queryKey: DCA_PLANS_KEY });
    } catch (e) {
      setStatus({
        kind: "error",
        text: e instanceof Error ? e.message.split("\n")[0] : "The plan could not be created",
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded-3xl border border-base-300 bg-base-100 p-5 shadow-xl">
      <h2 className="text-lg font-bold">Start an auto-buy</h2>

      <div className="text-sm">
        <span className="mb-1 block font-medium">Buy</span>
        <TokenSelect
          tokens={tokens.filter(t => !t.isNative)}
          value={tokenOut}
          onChange={setTokenOut}
          balanceOf={balanceOf}
        />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">HBAR to spend on each run</span>
        <input
          className="input input-bordered w-full"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(",", "."))}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium">How often</span>
          <select
            className="select select-bordered w-full"
            value={interval}
            onChange={e => setInterval(Number(e.target.value))}
          >
            {INTERVALS.map(({ label, seconds }) => (
              <option key={seconds} value={seconds}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Number of runs</span>
          <input
            type="number"
            min={1}
            max={MAX_RUNS}
            className="input input-bordered w-full"
            value={runs}
            onChange={e => setRuns(Math.min(MAX_RUNS, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
          />
        </label>
      </div>

      {cost && (
        <dl className="space-y-1 rounded-2xl bg-base-200 p-3 text-sm">
          <div className="flex justify-between">
            <dt className="opacity-70">Swap budget ({runs} runs)</dt>
            <dd>{formatAmount(cost.budget, HBAR.decimals)} HBAR</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Automation fee</dt>
            <dd>{formatAmount(cost.fee, HBAR.decimals)} HBAR</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total, plus about 1.5 HBAR network fee</dt>
            <dd>{formatAmount(cost.total, HBAR.decimals)} HBAR</dd>
          </div>
          {quote && tokenOut && minOut !== undefined && (
            <p className="pt-1 text-xs opacity-60">
              Each run needs at least {formatAmount(minOut, tokenOut.decimals)} {tokenOut.symbol} ({SLIPPAGE_BPS / 100}%
              below today&apos;s quote) or it is skipped and its HBAR stays in your plan.
            </p>
          )}
        </dl>
      )}

      <AssociateButton token={tokenOut} subject="wallet" />

      {status.kind === "busy" && (
        <div role="status" className="alert alert-info text-sm">
          <span className="loading loading-spinner loading-sm" />
          {status.text}
        </div>
      )}
      {status.kind === "done" && (
        <div role="status" className="alert alert-success text-sm">
          <span>
            Plan created. The first run is scheduled.{" "}
            <a className="link font-medium" href={hashscanTx(network, status.hash)} target="_blank" rel="noreferrer">
              View on Hashscan
            </a>
          </span>
        </div>
      )}
      {status.kind === "error" && (
        <div role="alert" className="alert alert-error text-sm">
          <span className="break-words">{status.text}</span>
        </div>
      )}

      {account ? (
        <button type="button" className="btn btn-primary w-full" disabled={!!blocker || busy} onClick={start}>
          {busy && <span className="loading loading-spinner loading-sm" />}
          {blocker ?? "Start auto-buy"}
        </button>
      ) : (
        <div className="flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
      )}
    </div>
  );
};

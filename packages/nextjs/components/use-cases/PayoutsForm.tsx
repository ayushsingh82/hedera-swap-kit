"use client";

import { useMemo, useState } from "react";
import { parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { TokenSelect } from "~~/components/swap";
import { useBatchPayout, usePayoutChecks, useSwapNetwork, useTokenBalances, useTokenList } from "~~/hooks/swap";
import type { PayoutCheck } from "~~/hooks/swap";
import { batchPayoutAbi } from "~~/utils/swap/abis";
import { hashscanTx, idToEvmAddress } from "~~/utils/swap/config";
import { WEIBAR_PER_TINYBAR, applySlippage, formatAmount } from "~~/utils/swap/math";
import { batchIdToBytes32, parsePayoutCsv, payoutGas } from "~~/utils/swap/payouts";
import { encodePath } from "~~/utils/swap/route";
import { HBAR } from "~~/utils/swap/tokens";

const EXAMPLE = `# address, HBAR to spend, token (optional)
0x846Ff469eC6e8592ae71D9D52999b89534639B3A, 0.5, SAUCE
0x1d17866a4B81d16A6B1a83338c9A11Bf56141d09, 0.3, HBAR`;

const SLIPPAGE_OPTIONS = [
  { label: "0.5%", bps: 50 },
  { label: "1%", bps: 100 },
  { label: "3%", bps: 300 },
];
/** HBAR kept back for the transaction fee when checking the balance. */
const FEE_RESERVE = 500_000_000n;
/** Testnet gas price in tinybar per gas, for the fee estimate only. */
const GAS_PRICE_TINYBAR = 84n;

const STATUS_LABEL: Record<PayoutCheck["status"], [string, string]> = {
  invalid: ["Fix this row", "badge-error"],
  ready: ["Ready", "badge-success"],
  "no-route": ["No route", "badge-error"],
  "not-associated": ["Not associated", "badge-warning"],
  "no-quote": ["No quote", "badge-error"],
  "no-account": ["No account", "badge-warning"],
};

type Result = { hash: string; sent: number; failed: number; failedRows: string[] };
type Status = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "error"; text: string };

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** Paste payouts, see what each recipient gets, and send them all with one signature. */
export const PayoutsForm = () => {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const { writeContractAsync } = useWriteContract();
  const { tokens } = useTokenList();
  const { balanceOf, refetch: refetchBalances } = useTokenBalances();
  const { address: batch, isDeployed } = useBatchPayout();

  const [text, setText] = useState("");
  const [defaultToken, setDefaultToken] = useState(HBAR);
  const [reference, setReference] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<Result>();

  const rows = useMemo(() => parsePayoutCsv(text, tokens, defaultToken), [text, tokens, defaultToken]);
  const { data: checks, isFetching } = usePayoutChecks(rows);
  const checkOf = (i: number): PayoutCheck | undefined => (rows[i].error ? { status: "invalid" } : checks?.[i]);

  const ready = rows.flatMap((row, i) => {
    const check = checkOf(i);
    return check?.status === "ready" ? [{ row, check }] : [];
  });
  const total = ready.reduce((sum, { row }) => sum + (row.amountIn ?? 0n), 0n);
  const gas = payoutGas(ready.length);
  const feeEstimate = gas * GAS_PRICE_TINYBAR;
  const balance = balanceOf(HBAR);
  const batchId = batchIdToBytes32(reference);
  const busy = status.kind === "busy";

  const blocker = (() => {
    if (!isDeployed) return "BatchPayout is not deployed on this network";
    if (!rows.length) return "Paste at least one payout";
    if (isFetching && !checks) return "Checking payouts…";
    if (!batchId) return "The reference is too long";
    if (!ready.length) return "No payout is ready to send";
    if (balance !== undefined && balance < total + FEE_RESERVE) return "Not enough HBAR";
    return undefined;
  })();

  const send = async () => {
    if (!batch || !publicClient || !batchId) return;
    setResult(undefined);
    try {
      setStatus({ kind: "busy", text: "Confirm in your wallet…" });
      const payments = ready.map(({ row, check }) => ({
        recipient: row.recipient!,
        amountIn: row.amountIn!,
        minOut: check.status === "ready" && check.route ? applySlippage(check.amountOut, slippageBps) : 0n,
        path:
          check.status === "ready" && check.route
            ? encodePath(check.route.tokens.map(idToEvmAddress), check.route.fees)
            : ("0x" as const),
      }));
      const hash = await writeContractAsync({
        address: batch,
        abi: batchPayoutAbi,
        functionName: "payout",
        args: [payments, batchId, BigInt(Math.floor(Date.now() / 1000) + 600)],
        value: total * WEIBAR_PER_TINYBAR,
        gas,
        chainId: network.chainId,
      });
      setStatus({ kind: "busy", text: "Waiting for the network…" });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted");

      const failed = parseEventLogs({ abi: batchPayoutAbi, logs: receipt.logs, eventName: "PayoutFailed" });
      setResult({
        hash,
        sent: ready.length - failed.length,
        failed: failed.length,
        failedRows: failed.map(
          f => `${short(f.args.recipient)} (${formatAmount(f.args.amountIn, HBAR.decimals)} HBAR)`,
        ),
      });
      setStatus({ kind: "idle" });
      refetchBalances();
    } catch (e) {
      setStatus({
        kind: "error",
        text: e instanceof Error ? e.message.split("\n")[0] : "The payout could not be sent",
      });
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-5">
      <div className="space-y-4 rounded-3xl border border-base-300 bg-base-100 p-5 shadow-xl lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Payouts</h2>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setText(EXAMPLE)}>
            Load example
          </button>
        </div>
        <textarea
          className="textarea textarea-bordered h-48 w-full rounded-2xl font-mono text-xs"
          placeholder={"address, HBAR to spend, token (optional)\n0x…, 0.5, SAUCE"}
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Payouts"
        />
        <p className="text-xs opacity-60">
          One per line. The amount is the HBAR you spend on that payment. The token is a symbol or Hedera id, or HBAR
          for a plain transfer. Up to 50 per batch.
        </p>
        <div className="text-sm">
          <span className="mb-1 block font-medium">Default token</span>
          <TokenSelect
            tokens={[HBAR, ...tokens.filter(t => !t.isNative)]}
            value={defaultToken}
            onChange={setDefaultToken}
          />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Reference (optional)</span>
          <input
            className={`input input-bordered w-full ${batchId ? "" : "input-error"}`}
            placeholder="2026-10 payroll"
            value={reference}
            onChange={e => setReference(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Slippage per payment</span>
          <select
            className="select select-bordered w-full"
            value={slippageBps}
            onChange={e => setSlippageBps(Number(e.target.value))}
          >
            {SLIPPAGE_OPTIONS.map(({ label, bps }) => (
              <option key={bps} value={bps}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-4 lg:col-span-3">
        <div className="overflow-x-auto rounded-3xl border border-base-300 bg-base-100 p-2 shadow-xl">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm opacity-60">Your payouts will be checked here.</p>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipient</th>
                  <th className="text-right">Spend</th>
                  <th className="text-right">Receives</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const check = checkOf(i);
                  const [label, badge] = check ? STATUS_LABEL[check.status] : ["Checking…", "badge-ghost"];
                  return (
                    <tr key={`${row.line}-${i}`}>
                      <td>{row.line}</td>
                      <td className="font-mono text-xs">{row.recipient ? short(row.recipient) : "?"}</td>
                      <td className="text-right">
                        {row.amountIn ? `${formatAmount(row.amountIn, HBAR.decimals)} HBAR` : "?"}
                      </td>
                      <td className="text-right">
                        {check?.status === "ready" && row.token
                          ? `${formatAmount(check.amountOut, row.token.decimals)} ${row.token.symbol}`
                          : "-"}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${badge}`}>{label}</span>
                        {row.error && <span className="ml-2 text-xs text-error">{row.error}</span>}
                        {check?.status === "no-account" && (
                          <span className="ml-2 text-xs opacity-70">
                            This address has no Hedera account yet. Send it some HBAR first.
                          </span>
                        )}
                        {check?.status === "not-associated" && row.token && (
                          <span className="ml-2 text-xs opacity-70">
                            The recipient must associate {row.token.symbol} first.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {ready.length > 0 && (
          <dl className="space-y-1 rounded-2xl bg-base-200 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="opacity-70">Payments to send</dt>
              <dd>
                {ready.length} of {rows.length}
              </dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total HBAR</dt>
              <dd>{formatAmount(total, HBAR.decimals)} HBAR</dd>
            </div>
            <div className="flex justify-between">
              <dt className="opacity-70">Network fee, about</dt>
              <dd>{formatAmount(feeEstimate, HBAR.decimals, 2)} HBAR</dd>
            </div>
            {ready.length < rows.length && (
              <p className="pt-1 text-xs opacity-60">
                Rows that are not ready are left out. Fix them and send again, or send the ready ones now.
              </p>
            )}
          </dl>
        )}

        {status.kind === "busy" && (
          <div role="status" className="alert alert-info text-sm">
            <span className="loading loading-spinner loading-sm" />
            {status.text}
          </div>
        )}
        {status.kind === "error" && (
          <div role="alert" className="alert alert-error text-sm">
            <span className="break-words">{status.text}</span>
          </div>
        )}
        {result && (
          <div role="status" className={`alert text-sm ${result.failed ? "alert-warning" : "alert-success"}`}>
            <span>
              {result.sent} paid
              {result.failed ? `, ${result.failed} failed and refunded (${result.failedRows.join(", ")})` : ""}.{" "}
              <a className="link font-medium" href={hashscanTx(network, result.hash)} target="_blank" rel="noreferrer">
                View on Hashscan
              </a>
            </span>
          </div>
        )}

        {account ? (
          <button type="button" className="btn btn-primary w-full" disabled={!!blocker || busy} onClick={send}>
            {busy && <span className="loading loading-spinner loading-sm" />}
            {blocker ?? `Send ${ready.length} payout${ready.length === 1 ? "" : "s"}`}
          </button>
        ) : (
          <div className="flex justify-center">
            <RainbowKitCustomConnectButton />
          </div>
        )}
      </div>
    </div>
  );
};

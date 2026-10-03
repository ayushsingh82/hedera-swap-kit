"use client";

import { Quote } from "~~/hooks/swap";
import { applySlippage, formatAmount } from "~~/utils/swap/math";
import { SwapRoute } from "~~/utils/swap/route";
import { SwapToken } from "~~/utils/swap/tokens";

type QuoteDetailsProps = {
  quote: Quote;
  tokenIn: SwapToken;
  tokenOut: SwapToken;
  amountIn: bigint;
  route: SwapRoute;
  /** Symbols for the route's token ids, in route order. */
  routeSymbols: string[];
  slippageBps: number;
  /** Integrator fee of the deployed SwapHelper, in basis points. */
  feeBps: number;
};

const impactClass = (impact: number) => (impact >= 5 ? "text-error" : impact >= 1 ? "text-warning" : "");

/** The rate, minimum received, price impact, route and fees for a quote. */
export const QuoteDetails = ({
  quote,
  tokenIn,
  tokenOut,
  amountIn,
  route,
  routeSymbols,
  slippageBps,
  feeBps,
}: QuoteDetailsProps) => {
  const rate =
    amountIn > 0n ? Number(quote.amountOut) / 10 ** tokenOut.decimals / (Number(amountIn) / 10 ** tokenIn.decimals) : 0;
  const poolFees = route.fees.map(fee => `${fee / 10_000}%`).join(" + ");

  const rows: [string, React.ReactNode, string?][] = [
    [
      "Rate",
      `1 ${tokenIn.symbol} ≈ ${rate.toLocaleString("en-US", { maximumSignificantDigits: 6 })} ${tokenOut.symbol}`,
    ],
    [
      `Minimum received (${slippageBps / 100}% slippage)`,
      `${formatAmount(applySlippage(quote.amountOut, slippageBps), tokenOut.decimals)} ${tokenOut.symbol}`,
    ],
    [
      "Price impact",
      `${quote.priceImpact < 0.01 ? "<0.01" : quote.priceImpact.toFixed(2)}%`,
      impactClass(quote.priceImpact),
    ],
    ["Route", routeSymbols.join(" → ")],
    ["Pool fee", poolFees],
  ];
  if (feeBps > 0) {
    rows.push(["App fee", `${feeBps / 100}% (${formatAmount(quote.fee, tokenIn.decimals)} ${tokenIn.symbol})`]);
  }

  return (
    <dl className="space-y-1 rounded-2xl border border-base-300 p-3 text-sm">
      {rows.map(([label, value, className]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="opacity-60">{label}</dt>
          <dd className={`text-right tabular-nums ${className ?? ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

import { formatUnits, parseUnits } from "viem";

export const BPS = 10_000n;
/** JSON-RPC msg.value is in weibar (18 decimals) while Hedera contracts see tinybar (8 decimals). */
export const WEIBAR_PER_TINYBAR = 10n ** 10n;

/** Parses a user-typed decimal string. Returns undefined for empty, invalid or too-precise input. */
export function parseAmount(value: string, decimals: number): bigint | undefined {
  const trimmed = value.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "" || trimmed === ".") return undefined;
  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) return undefined;
  return parseUnits(trimmed, decimals);
}

/** Formats a raw amount for display, trimming trailing zeros and capping the fraction digits. */
export function formatAmount(amount: bigint, decimals: number, maxFractionDigits = 6): string {
  const [whole, fraction = ""] = formatUnits(amount, decimals).split(".");
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** The least the swap may pay out before it reverts. `slippageBps` 50 = 0.5%. */
export function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * (BPS - BigInt(slippageBps))) / BPS;
}

/**
 * Price impact in percent: how much worse the executed rate is than the rate of a small reference trade.
 * Returns 0 when the reference trade has no output, so callers never divide by zero.
 */
export function priceImpactPercent(amountIn: bigint, amountOut: bigint, refIn: bigint, refOut: bigint): number {
  if (amountIn === 0n || refIn === 0n || refOut === 0n) return 0;
  const scale = 10n ** 18n;
  const executed = (amountOut * scale) / amountIn;
  const reference = (refOut * scale) / refIn;
  if (reference === 0n) return 0;
  const impact = Number(((reference - executed) * 10_000n) / reference) / 100;
  return Math.max(0, impact);
}

/** Splits a fee in basis points off an amount, matching SwapHelper's rounding (down). */
export function splitFee(amount: bigint, feeBps: number): { net: bigint; fee: bigint } {
  const fee = (amount * BigInt(feeBps)) / BPS;
  return { net: amount - fee, fee };
}

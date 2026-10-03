"use client";

import { formatAmount } from "~~/utils/swap/math";
import { SwapToken } from "~~/utils/swap/tokens";

type AmountInputProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  token?: SwapToken;
  /** The connected account's balance in the token's smallest unit. */
  balance?: bigint;
  /** Shows a MAX button that fills this raw amount. Omit it for read-only outputs. */
  onMax?: () => void;
  readOnly?: boolean;
  loading?: boolean;
  /** Slot for the token picker. */
  tokenSelect: React.ReactNode;
};

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2 });

/** An amount field with a token picker, balance, MAX button and USD value. */
export const AmountInput = ({
  label,
  value,
  onChange,
  token,
  balance,
  onMax,
  readOnly,
  loading,
  tokenSelect,
}: AmountInputProps) => {
  const numeric = Number(value);
  const usd = token?.priceUsd && numeric > 0 ? numeric * token.priceUsd : undefined;

  return (
    <div className="rounded-2xl bg-base-200 p-4">
      <div className="mb-2 flex items-center justify-between text-xs opacity-70">
        <span>{label}</span>
        {token && balance !== undefined && (
          <span className="flex items-center gap-2">
            Balance: {formatAmount(balance, token.decimals, 4)}
            {onMax && balance > 0n && (
              <button type="button" className="btn btn-xs btn-ghost text-primary px-1" onClick={onMax}>
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.0"
          aria-label={label}
          readOnly={readOnly}
          value={value}
          onChange={e => onChange?.(e.target.value.replace(",", "."))}
          className={`w-full min-w-0 bg-transparent text-2xl font-semibold outline-none placeholder:opacity-40 ${
            loading ? "animate-pulse opacity-50" : ""
          }`}
        />
        {tokenSelect}
      </div>
      <div className="mt-1 h-4 text-xs opacity-60">{usd !== undefined ? `≈ ${formatUsd(usd)}` : ""}</div>
    </div>
  );
};

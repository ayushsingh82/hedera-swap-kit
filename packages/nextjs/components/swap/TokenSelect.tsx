"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { formatAmount } from "~~/utils/swap/math";
import { SwapToken } from "~~/utils/swap/tokens";

export const TokenIcon = ({ token, size = 28 }: { token: SwapToken; size?: number }) =>
  token.icon ? (
    // eslint-disable-next-line @next/next/no-img-element -- icons come from many third-party hosts
    <img src={token.icon} alt={token.symbol} width={size} height={size} className="rounded-full bg-base-200" />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-primary/15 text-primary font-bold"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {token.symbol.slice(0, 2).toUpperCase()}
    </span>
  );

type TokenSelectProps = {
  tokens: SwapToken[];
  value?: SwapToken;
  onChange: (token: SwapToken) => void;
  /** Returns the connected account's balance in the token's smallest unit, or undefined while loading. */
  balanceOf?: (token: SwapToken) => bigint | undefined;
  /** A token that cannot be picked here, usually the one chosen on the other side of the swap. */
  disabledToken?: SwapToken;
};

/** A button that opens a searchable list of tokens with icon, symbol and balance. */
export const TokenSelect = ({ tokens, value, onChange, balanceOf, disabledToken }: TokenSelectProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(t => [t.symbol, t.name, t.id].some(field => field.toLowerCase().includes(q)));
  }, [tokens, query]);

  const open = () => dialogRef.current?.showModal();
  const close = () => {
    dialogRef.current?.close();
    setQuery("");
  };

  return (
    <>
      <button type="button" className="btn btn-sm rounded-full gap-2 shrink-0" onClick={open}>
        {value ? (
          <>
            <TokenIcon token={value} size={20} />
            {value.symbol}
          </>
        ) : (
          "Select token"
        )}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      <dialog ref={dialogRef} className="modal" onClose={() => setQuery("")}>
        <div className="modal-box max-w-md p-0">
          <div className="p-4 border-b border-base-300">
            <h3 className="font-bold mb-3">Select a token</h3>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <MagnifyingGlassIcon className="h-4 w-4 opacity-60" />
              <input
                type="text"
                placeholder="Search by name, symbol or 0.0.id"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </label>
          </div>

          <ul className="max-h-96 overflow-y-auto p-2">
            {filtered.length === 0 && (
              <li className="p-6 text-center text-sm opacity-60">No tokens match your search</li>
            )}
            {filtered.map(token => {
              const balance = balanceOf?.(token);
              const disabled = token.id === disabledToken?.id;
              return (
                <li key={token.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-base-200 disabled:opacity-40"
                    onClick={() => {
                      onChange(token);
                      close();
                    }}
                  >
                    <TokenIcon token={token} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">{token.symbol}</span>
                      <span className="block truncate text-xs opacity-60">
                        {token.name} {token.isNative ? "" : `· ${token.id}`}
                      </span>
                    </span>
                    {balance !== undefined && balance > 0n && (
                      <span className="text-sm tabular-nums">{formatAmount(balance, token.decimals, 4)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setQuery("")}>close</button>
        </form>
      </dialog>
    </>
  );
};

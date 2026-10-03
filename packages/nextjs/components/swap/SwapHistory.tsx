"use client";

import { useMemo } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { useSwapHelper, useSwapHistory, useSwapNetwork, useTokenList } from "~~/hooks/swap";
import { hashscanTx } from "~~/utils/swap/config";
import { formatAmount } from "~~/utils/swap/math";
import { HBAR, SwapToken } from "~~/utils/swap/tokens";

/** The connected account's recent swaps through SwapHelper, read from the mirror node. */
export const SwapHistory = () => {
  const network = useSwapNetwork();
  const { address } = useAccount();
  const { isDeployed } = useSwapHelper();
  const { tokens } = useTokenList();
  const { data: swaps, isLoading, error } = useSwapHistory();

  const byAddress = useMemo(() => new Map<string, SwapToken>(tokens.map(t => [t.address.toLowerCase(), t])), [tokens]);
  const lookup = (tokenAddress: string): SwapToken | undefined =>
    tokenAddress === zeroAddress ? HBAR : byAddress.get(tokenAddress.toLowerCase());
  const show = (tokenAddress: string, amount: bigint) => {
    const token = lookup(tokenAddress);
    return token ? `${formatAmount(amount, token.decimals)} ${token.symbol}` : `${amount} (unknown token)`;
  };

  if (!address) return <p className="text-center text-sm opacity-60">Connect a wallet to see your swaps.</p>;
  if (!isDeployed)
    return <p className="text-center text-sm opacity-60">SwapHelper is not deployed on {network.name}.</p>;
  if (isLoading) return <span className="loading loading-spinner mx-auto block" />;
  if (error)
    return (
      <p role="alert" className="text-center text-sm text-error">
        Could not load swap history: {error.message}
      </p>
    );
  if (!swaps?.length)
    return <p className="text-center text-sm opacity-60">No swaps yet. Your swaps will show up here.</p>;

  return (
    <ul className="divide-y divide-base-300">
      {swaps.map(swap => (
        <li
          key={`${swap.hash}-${swap.timestamp.getTime()}`}
          className="flex items-center justify-between gap-4 py-3 text-sm"
        >
          <span>
            <span className="font-medium">
              {show(swap.tokenIn, swap.amountIn)} → {show(swap.tokenOut, swap.amountOut)}
            </span>
            <span className="block text-xs opacity-60">{swap.timestamp.toLocaleString()}</span>
          </span>
          <a href={hashscanTx(network, swap.hash)} target="_blank" rel="noreferrer" className="link text-xs shrink-0">
            Hashscan
          </a>
        </li>
      ))}
    </ul>
  );
};

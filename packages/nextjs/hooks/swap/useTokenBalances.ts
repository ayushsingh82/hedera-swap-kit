import { useCallback } from "react";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance } from "wagmi";
import { WEIBAR_PER_TINYBAR } from "~~/utils/swap/math";
import { SwapToken } from "~~/utils/swap/tokens";

type MirrorTokenBalances = { tokens: { token_id: string; balance: number }[] };

/**
 * Balances of the connected account: native HBAR from the wallet and HTS tokens from the mirror node.
 * Amounts are in each token's smallest unit (tinybar for HBAR). The mirror node returns the first 100 tokens.
 */
export function useTokenBalances() {
  const network = useSwapNetwork();
  const { address } = useAccount();
  const { data: hbar, refetch: refetchHbar } = useBalance({ address, chainId: network.chainId });

  const { data: tokens, refetch: refetchTokens } = useQuery({
    queryKey: ["swap", "balances", network.chainId, address],
    enabled: !!address,
    refetchInterval: 20_000,
    queryFn: async () => {
      const response = await fetch(`${network.mirrorNode}/api/v1/accounts/${address}/tokens?limit=100`);
      // An account that has not been created yet is not an error, it just holds nothing.
      if (response.status === 404) return {} as Record<string, bigint>;
      if (!response.ok) throw new Error(`Mirror node request failed (${response.status})`);
      const body = (await response.json()) as MirrorTokenBalances;
      return Object.fromEntries(body.tokens.map(t => [t.token_id, BigInt(t.balance)]));
    },
  });

  const balanceOf = useCallback(
    (token: SwapToken): bigint | undefined => {
      if (token.isNative) return hbar ? hbar.value / WEIBAR_PER_TINYBAR : undefined;
      return tokens ? (tokens[token.id] ?? 0n) : undefined;
    },
    [hbar, tokens],
  );

  const refetch = useCallback(() => Promise.all([refetchHbar(), refetchTokens()]), [refetchHbar, refetchTokens]);

  return { balanceOf, refetch };
}

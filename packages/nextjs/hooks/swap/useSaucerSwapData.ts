import { useMemo } from "react";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { SwapPool, toSwapPools } from "~~/utils/swap/route";
import { SaucerSwapApiToken, SwapToken, buildTokenList } from "~~/utils/swap/tokens";

const STALE_TIME = 5 * 60 * 1000;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json() as Promise<T>;
}

/** Swappable tokens for the current network: native HBAR first, then every token with a V2 pool. */
export function useTokenList() {
  const network = useSwapNetwork();
  const query = useQuery({
    queryKey: ["swap", "tokens", network.chainId],
    queryFn: () => getJson<SaucerSwapApiToken[]>(`${network.saucerApi}/tokens`),
    staleTime: STALE_TIME,
  });
  const tokens: SwapToken[] = useMemo(
    () => (query.data ? buildTokenList(query.data, network) : []),
    [query.data, network],
  );
  return { tokens, isLoading: query.isLoading, error: query.error };
}

/** Raw SaucerSwap V2 pool as returned by the API (only the fields the template reads). */
export type ApiPool = {
  id: number;
  contractId: string;
  fee: number;
  liquidity: string;
  amountA: string;
  amountB: string;
  tokenA: { id: string; symbol: string; decimals: number; icon?: string | null; priceUsd?: number };
  tokenB: { id: string; symbol: string; decimals: number; icon?: string | null; priceUsd?: number };
};

/** All V2 pools for the current network, plus the trimmed list the route finder uses. */
export function usePools() {
  const network = useSwapNetwork();
  const query = useQuery({
    queryKey: ["swap", "pools", network.chainId],
    queryFn: () => getJson<ApiPool[]>(`${network.saucerApi}/v2/pools`),
    staleTime: STALE_TIME,
  });
  const swapPools: SwapPool[] = useMemo(() => (query.data ? toSwapPools(query.data) : []), [query.data]);
  return { pools: query.data ?? [], swapPools, isLoading: query.isLoading, error: query.error };
}

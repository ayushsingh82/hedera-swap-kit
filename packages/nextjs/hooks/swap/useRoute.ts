import { useMemo } from "react";
import { usePools } from "./useSaucerSwapData";
import { useSwapNetwork } from "./useSwapNetwork";
import { SwapRoute, findRoute } from "~~/utils/swap/route";
import { SwapToken, pathId } from "~~/utils/swap/tokens";

/** The best route between two tokens from live pool liquidity, or undefined when there is none. */
export function useRoute(tokenIn?: SwapToken, tokenOut?: SwapToken) {
  const network = useSwapNetwork();
  const { swapPools, isLoading } = usePools();

  const route: SwapRoute | undefined = useMemo(() => {
    if (!tokenIn || !tokenOut) return undefined;
    return findRoute(swapPools, pathId(tokenIn, network), pathId(tokenOut, network), network.whbarId);
  }, [swapPools, tokenIn, tokenOut, network]);

  return { route, isLoading };
}

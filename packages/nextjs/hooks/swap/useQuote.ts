import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { quoterV2Abi } from "~~/utils/swap/abis";
import { idToEvmAddress } from "~~/utils/swap/config";
import { priceImpactPercent, splitFee } from "~~/utils/swap/math";
import { SwapRoute, encodePath } from "~~/utils/swap/route";

export type Quote = {
  /** What the swap pays out after the integrator fee and pool fees. */
  amountOut: bigint;
  /** Integrator fee kept by SwapHelper, taken from the input. */
  fee: bigint;
  priceImpact: number;
};

const REFERENCE_DIVISOR = 100n;

/**
 * Quotes a swap through SaucerSwap's QuoterV2. `amountIn` is the gross amount the user pays, in the input token's
 * smallest unit (tinybar for HBAR). A second, 1% sized quote gives the reference rate used for price impact.
 */
export function useQuote(route: SwapRoute | undefined, amountIn: bigint | undefined) {
  const network = useSwapNetwork();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const { feeBps } = useSwapHelper();

  return useQuery({
    queryKey: ["swap", "quote", network.chainId, route?.tokens, route?.fees, amountIn?.toString(), feeBps],
    enabled: !!route && !!publicClient && !!amountIn && amountIn > 0n,
    refetchInterval: 15_000,
    retry: 1,
    queryFn: async (): Promise<Quote> => {
      if (!route || !publicClient || !amountIn) throw new Error("Quote requested without a route or amount");
      const path = encodePath(route.tokens.map(idToEvmAddress), route.fees);
      const quote = async (amount: bigint) => {
        const { result } = await publicClient.simulateContract({
          address: network.quoterV2,
          abi: quoterV2Abi,
          functionName: "quoteExactInput",
          args: [path, amount],
        });
        return result[0];
      };

      const { net, fee } = splitFee(amountIn, feeBps);
      const refIn = net > REFERENCE_DIVISOR ? net / REFERENCE_DIVISOR : net;
      const [amountOut, refOut] = await Promise.all([quote(net), quote(refIn)]);
      return { amountOut, fee, priceImpact: priceImpactPercent(net, amountOut, refIn, refOut) };
    },
  });
}

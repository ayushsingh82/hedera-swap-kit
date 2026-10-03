import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MirrorLog, SwapRecord, parseSwapLogs } from "~~/utils/swap/history";

export type { SwapRecord } from "~~/utils/swap/history";

const PAGE_SIZE = 100;
/** Pages of the contract's logs to scan. Each page holds every user's events, newest first. */
const MAX_PAGES = 5;

/**
 * Recent swaps the connected account made through SwapHelper, read from the mirror node's contract logs.
 * `tokenIn` or `tokenOut` is the zero address for native HBAR.
 */
export function useSwapHistory(limit = 20) {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const { address: helper } = useSwapHelper();

  return useQuery({
    queryKey: ["swap", "history", network.chainId, helper, account, limit],
    enabled: !!helper && !!account,
    refetchInterval: 30_000,
    queryFn: async (): Promise<SwapRecord[]> => {
      const swaps: SwapRecord[] = [];
      let next: string | null = `/api/v1/contracts/${helper}/results/logs?order=desc&limit=${PAGE_SIZE}`;

      for (let page = 0; next && page < MAX_PAGES && swaps.length < limit; page++) {
        const response: Response = await fetch(`${network.mirrorNode}${next}`);
        if (!response.ok) throw new Error(`Mirror node request failed (${response.status})`);
        const body = (await response.json()) as { logs: MirrorLog[]; links?: { next?: string | null } };
        swaps.push(...parseSwapLogs(body.logs, account as string));
        next = body.links?.next ?? null;
      }
      return swaps.slice(0, limit);
    },
  });
}

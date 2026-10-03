import { useScheduledSwap } from "./useScheduledSwap";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { useAccount } from "wagmi";
import { scheduledSwapAbi } from "~~/utils/swap/abis";
import { PlanView, parsePlanIds } from "~~/utils/swap/dca";
import type { MirrorLog } from "~~/utils/swap/history";

const PAGE_SIZE = 100;
/** Pages of the contract's logs to scan, newest first. Each page holds every user's events. */
const MAX_PAGES = 5;

export const DCA_PLANS_KEY = ["dca", "plans"] as const;

/** The connected account's auto-buy plans, newest first. Plan ids come from `PlanCreated` logs on the mirror node. */
export function useDcaPlans() {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const { address: dca } = useScheduledSwap();
  const publicClient = usePublicClient({ chainId: network.chainId });

  return useQuery({
    queryKey: [...DCA_PLANS_KEY, network.chainId, dca, account],
    enabled: !!dca && !!account && !!publicClient,
    refetchInterval: 15_000,
    queryFn: async (): Promise<PlanView[]> => {
      const ids: bigint[] = [];
      let next: string | null = `/api/v1/contracts/${dca}/results/logs?order=desc&limit=${PAGE_SIZE}`;
      for (let page = 0; next && page < MAX_PAGES; page++) {
        const response: Response = await fetch(`${network.mirrorNode}${next}`);
        if (!response.ok) throw new Error(`Mirror node request failed (${response.status})`);
        const body = (await response.json()) as { logs: MirrorLog[]; links?: { next?: string | null } };
        ids.push(...parsePlanIds(body.logs, account as string));
        next = body.links?.next ?? null;
      }

      const plans = await Promise.all(
        ids.map(async id => {
          const plan = await publicClient!.readContract({
            address: dca as `0x${string}`,
            abi: scheduledSwapAbi,
            functionName: "getPlan",
            args: [id],
          });
          return { id, ...plan } as PlanView;
        }),
      );
      return plans.sort((a, b) => (a.id > b.id ? -1 : 1));
    },
  });
}

import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { decodeEventLog, pad, toEventSelector } from "viem";
import { useAccount } from "wagmi";
import { swapHelperAbi } from "~~/utils/swap/abis";

export type SwapRecord = {
  hash: string;
  timestamp: Date;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
};

type MirrorLog = { data: string; topics: string[]; transaction_hash: string; timestamp: string };

const swappedEvent = swapHelperAbi.find(item => item.type === "event" && item.name === "Swapped")!;
const SWAPPED_TOPIC = toEventSelector(swappedEvent);

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
      const url = `${network.mirrorNode}/api/v1/contracts/${helper}/results/logs?topic0=${SWAPPED_TOPIC}&topic1=${pad(account as `0x${string}`)}&order=desc&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mirror node request failed (${response.status})`);
      const { logs } = (await response.json()) as { logs: MirrorLog[] };

      return logs.map(log => {
        const { args } = decodeEventLog({
          abi: [swappedEvent],
          data: log.data as `0x${string}`,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });
        return {
          hash: log.transaction_hash,
          timestamp: new Date(Number(log.timestamp.split(".")[0]) * 1000),
          tokenIn: args.tokenIn,
          tokenOut: args.tokenOut,
          amountIn: args.amountIn,
          amountOut: args.amountOut,
          fee: args.fee,
        };
      });
    },
  });
}

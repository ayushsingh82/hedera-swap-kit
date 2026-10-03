import { decodeEventLog, toEventSelector } from "viem";
import { swapHelperAbi } from "./abis";

export type SwapRecord = {
  hash: string;
  timestamp: Date;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
};

export type MirrorLog = { data: string; topics: string[]; transaction_hash: string; timestamp: string };

const swappedEvent = swapHelperAbi.find(item => item.type === "event" && item.name === "Swapped")!;
const SWAPPED_TOPIC = toEventSelector(swappedEvent);

/** An indexed address as a 32-byte topic, lowercased the way the mirror node returns it. */
const toTopic = (address: string) => `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;

/**
 * Picks the `Swapped` events made by `account` out of a contract's logs and decodes them. The mirror node only
 * accepts a topic filter together with a closed timestamp range, so the hook fetches plain logs and filters here.
 */
export function parseSwapLogs(logs: MirrorLog[], account: string): SwapRecord[] {
  const user = toTopic(account);
  return logs
    .filter(log => log.topics[0]?.toLowerCase() === SWAPPED_TOPIC && log.topics[1]?.toLowerCase() === user)
    .map(log => {
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
}

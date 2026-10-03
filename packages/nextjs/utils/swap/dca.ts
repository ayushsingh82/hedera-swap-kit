import { scheduledSwapAbi } from "./abis";
import type { MirrorLog } from "./history";
import { decodeEventLog, toEventSelector } from "viem";

/** Creating a plan schedules the first run through the Schedule Service, which used about 1.5M gas on testnet. */
export const DCA_CREATE_GAS = 2_500_000n;

export const INTERVALS = [
  { label: "Every minute (demo)", seconds: 60 },
  { label: "Every hour", seconds: 3600 },
  { label: "Every day", seconds: 86_400 },
  { label: "Every week", seconds: 604_800 },
] as const;

export type PlanView = {
  id: bigint;
  owner: `0x${string}`;
  recipient: `0x${string}`;
  path: `0x${string}`;
  amountPerRun: bigint;
  minOutPerRun: bigint;
  interval: bigint;
  runsLeft: bigint;
  runsDone: bigint;
  budget: bigint;
  schedule: `0x${string}`;
  active: boolean;
};

/** What a plan costs up front, in tinybar. The fee pays the network for running each scheduled call. */
export function dcaCost(amountPerRun: bigint, runs: number, feePerRun: bigint) {
  const budget = amountPerRun * BigInt(runs);
  const fee = feePerRun * BigInt(runs);
  return { budget, fee, total: budget + fee };
}

export type PlanStatus = "active" | "paused" | "ended";

/** A plan with runs left that is not active is paused: the Schedule Service refused the next run. */
export function planStatus(plan: Pick<PlanView, "active" | "runsLeft">): PlanStatus {
  if (plan.active) return "active";
  return plan.runsLeft > 0n ? "paused" : "ended";
}

/** The Hedera id of a schedule (0.0.N) from its long-zero EVM address, or undefined when there is none. */
export function scheduleId(address: string): string | undefined {
  const num = BigInt(address);
  return num === 0n ? undefined : `0.0.${num}`;
}

export function formatInterval(seconds: number | bigint): string {
  const s = Number(seconds);
  const known = INTERVALS.find(i => i.seconds === s);
  if (known) return known.label.replace(" (demo)", "").toLowerCase();
  return s % 86_400 === 0
    ? `every ${s / 86_400} days`
    : s % 3600 === 0
      ? `every ${s / 3600} hours`
      : `every ${s} seconds`;
}

const planCreatedEvent = scheduledSwapAbi.find(item => item.type === "event" && item.name === "PlanCreated")!;
const PLAN_CREATED_TOPIC = toEventSelector(planCreatedEvent);

/** Ids of the plans `account` created, newest first, from a contract's logs. */
export function parsePlanIds(logs: MirrorLog[], account: string): bigint[] {
  const owner = `0x${account.slice(2).toLowerCase().padStart(64, "0")}`;
  return logs
    .filter(log => log.topics[0]?.toLowerCase() === PLAN_CREATED_TOPIC && log.topics[2]?.toLowerCase() === owner)
    .map(log => {
      const { args } = decodeEventLog({
        abi: [planCreatedEvent],
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      return args.id;
    })
    .sort((a, b) => (a > b ? -1 : 1));
}

import { useSwapNetwork } from "./useSwapNetwork";
import { useReadContract } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { scheduledSwapAbi } from "~~/utils/swap/abis";

/**
 * The deployed ScheduledSwap for the current network and its automation fee per run (tinybar).
 * `address` is undefined until `npm run hardhat:deploy` has written it to deployedContracts.ts for this network.
 */
export function useScheduledSwap() {
  const network = useSwapNetwork();
  const { data: deployed, isLoading } = useDeployedContractInfo({
    // TODO: drop the cast once ScheduledSwap is deployed to testnet, so deployedContracts.ts types it for chain 296.
    contractName: "ScheduledSwap" as never,
    chainId: network.chainId as never,
  });
  const address = (deployed as { address?: string } | undefined)?.address as `0x${string}` | undefined;

  const { data: feePerRun } = useReadContract({
    address,
    abi: scheduledSwapAbi,
    functionName: "automationFeePerRun",
    chainId: network.chainId,
    query: { enabled: !!address },
  });

  return { address, feePerRun: feePerRun ?? 0n, isDeployed: !!address, isLoading };
}

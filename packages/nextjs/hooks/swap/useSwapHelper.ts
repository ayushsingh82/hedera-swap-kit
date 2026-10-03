import { useSwapNetwork } from "./useSwapNetwork";
import { useReadContract } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { swapHelperAbi } from "~~/utils/swap/abis";

/**
 * The deployed SwapHelper for the current network and its integrator fee.
 * `address` is undefined until `npm run hardhat:deploy` has written it to deployedContracts.ts for this network.
 */
export function useSwapHelper() {
  const network = useSwapNetwork();
  const { data: deployed, isLoading } = useDeployedContractInfo({
    contractName: "SwapHelper",
    chainId: network.chainId as never,
  });
  const address = deployed?.address as `0x${string}` | undefined;

  const { data: feeBps } = useReadContract({
    address,
    abi: swapHelperAbi,
    functionName: "feeBps",
    chainId: network.chainId,
    query: { enabled: !!address },
  });

  return { address, feeBps: feeBps ?? 0, isDeployed: !!address, isLoading };
}

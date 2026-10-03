import { useSwapNetwork } from "./useSwapNetwork";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";

/**
 * The deployed BatchPayout for the current network.
 * `address` is undefined until `npm run hardhat:deploy` has written it to deployedContracts.ts for this network.
 */
export function useBatchPayout() {
  const network = useSwapNetwork();
  const { data: deployed, isLoading } = useDeployedContractInfo({
    contractName: "BatchPayout",
    chainId: network.chainId as never,
  });
  const address = (deployed as { address?: string } | undefined)?.address as `0x${string}` | undefined;

  return { address, isDeployed: !!address, isLoading };
}

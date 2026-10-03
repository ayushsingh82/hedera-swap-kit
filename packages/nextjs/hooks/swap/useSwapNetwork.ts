import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { SwapNetwork, getSwapNetwork } from "~~/utils/swap/config";

/** SaucerSwap and mirror node endpoints for the chain the wallet is on, or the target network when disconnected. */
export function useSwapNetwork(): SwapNetwork {
  const { chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  return getSwapNetwork(chain?.id ?? targetNetwork.id);
}

import { useCallback, useState } from "react";
import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { getParsedError } from "~~/utils/scaffold-hbar";
import { erc20Abi, swapHelperAbi } from "~~/utils/swap/abis";
import { idToEvmAddress } from "~~/utils/swap/config";
import { WEIBAR_PER_TINYBAR } from "~~/utils/swap/math";
import { SwapRoute, encodePath } from "~~/utils/swap/route";
import { SwapToken } from "~~/utils/swap/tokens";

const SWAP_GAS = 1_500_000n;
const APPROVE_GAS = 800_000n;
const DEADLINE_SECONDS = 600n;

export type SwapParams = {
  tokenIn: SwapToken;
  tokenOut: SwapToken;
  route: SwapRoute;
  /** Gross input in the input token's smallest unit (tinybar for HBAR). */
  amountIn: bigint;
  /** The least the swap may pay out. Below this it reverts. */
  amountOutMinimum: bigint;
  /** Defaults to the connected account. */
  recipient?: `0x${string}`;
  /** Seconds the swap stays valid. Defaults to 10 minutes. */
  deadlineSeconds?: bigint;
};

export type SwapStatus = "idle" | "approving" | "swapping" | "confirming" | "success" | "error";

/**
 * Runs a swap through SwapHelper: approves the helper when the input is a token, sends the swap, and waits for the
 * receipt. The helper picks the right entry point: HBAR in, token to token, or token to HBAR.
 */
export function useSwap() {
  const network = useSwapNetwork();
  const { address: account } = useAccount();
  const { address: helper } = useSwapHelper();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<SwapStatus>("idle");
  const [hash, setHash] = useState<`0x${string}`>();
  const [error, setError] = useState<string>();

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(undefined);
    setError(undefined);
  }, []);

  const swap = useCallback(
    async (params: SwapParams) => {
      if (!account || !helper || !publicClient)
        throw new Error("Connect a wallet on a network where SwapHelper is deployed");
      const { tokenIn, tokenOut, route, amountIn, amountOutMinimum } = params;
      const recipient = params.recipient ?? account;
      const deadline = BigInt(Math.floor(Date.now() / 1000)) + (params.deadlineSeconds ?? DEADLINE_SECONDS);
      const path = encodePath(route.tokens.map(idToEvmAddress), route.fees);
      const common = { address: helper, abi: swapHelperAbi, gas: SWAP_GAS, chainId: network.chainId } as const;

      setError(undefined);
      setHash(undefined);
      try {
        if (!tokenIn.isNative) {
          const allowance = await publicClient.readContract({
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [account, helper],
          });
          if (allowance < amountIn) {
            setStatus("approving");
            const approval = await writeContractAsync({
              address: tokenIn.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [helper, amountIn],
              gas: APPROVE_GAS,
              chainId: network.chainId,
            });
            await publicClient.waitForTransactionReceipt({ hash: approval });
          }
        }

        setStatus("swapping");
        const txHash = tokenIn.isNative
          ? await writeContractAsync({
              ...common,
              functionName: "swapExactHbarForTokens",
              args: [path, recipient, amountOutMinimum, deadline],
              value: amountIn * WEIBAR_PER_TINYBAR,
            })
          : tokenOut.isNative
            ? await writeContractAsync({
                ...common,
                functionName: "swapExactTokensForHbar",
                args: [path, recipient, amountIn, amountOutMinimum, deadline],
              })
            : await writeContractAsync({
                ...common,
                functionName: "swapExactTokensForTokens",
                args: [path, recipient, amountIn, amountOutMinimum, deadline],
              });
        setHash(txHash);

        setStatus("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("The swap transaction reverted");
        setStatus("success");
        return txHash;
      } catch (e) {
        setError(getParsedError(e));
        setStatus("error");
        return undefined;
      }
    },
    [account, helper, publicClient, writeContractAsync, network.chainId],
  );

  return {
    swap,
    reset,
    status,
    hash,
    error,
    isBusy: status === "approving" || status === "swapping" || status === "confirming",
  };
}

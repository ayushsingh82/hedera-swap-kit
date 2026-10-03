import { useState } from "react";
import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { getParsedError } from "~~/utils/scaffold-hbar";
import { hrc719Abi, swapHelperAbi } from "~~/utils/swap/abis";
import { SwapToken } from "~~/utils/swap/tokens";

// Association consumed ~0.73M gas on testnet, so 0.8M is too tight.
const ASSOCIATE_GAS = 1_000_000n;

/**
 * Whether an account is associated with an HTS token, and a way to associate it. On Hedera an account, and a
 * contract, must be associated with a token before it can receive it.
 *
 * `subject` "wallet" is the connected account (needed for any token you swap *to*). "helper" is the SwapHelper
 * contract (needed for any token you swap *from*, because it pulls the token before swapping).
 */
export function useAssociation(token: SwapToken | undefined, subject: "wallet" | "helper", accountOverride?: string) {
  const network = useSwapNetwork();
  const { address: wallet } = useAccount();
  const { address: helper } = useSwapHelper();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [isAssociating, setIsAssociating] = useState(false);
  const [error, setError] = useState<string>();

  // With accountOverride the hook only checks that account. Associating needs that account's own signature.
  const account = accountOverride ?? (subject === "wallet" ? wallet : helper);
  const needsCheck = !!token && !token.isNative && !!account;
  const queryKey = ["swap", "association", network.chainId, subject, account, token?.id];

  const { data: isAssociated, isLoading } = useQuery({
    queryKey,
    enabled: needsCheck,
    queryFn: async () => {
      const response = await fetch(`${network.mirrorNode}/api/v1/accounts/${account}/tokens?token.id=${token?.id}`);
      if (response.status === 404) return false;
      if (!response.ok) throw new Error(`Mirror node request failed (${response.status})`);
      const body = (await response.json()) as { tokens: unknown[] };
      if (body.tokens.length > 0) return true;

      // An account that allows automatic associations (the default for new accounts) gets the token on arrival.
      // SwapHelper pulls its input token itself, so that case still needs an explicit association.
      if (subject !== "wallet") return false;
      const account_ = await fetch(`${network.mirrorNode}/api/v1/accounts/${account}`);
      if (!account_.ok) return false;
      const { max_automatic_token_associations: auto } = (await account_.json()) as {
        max_automatic_token_associations?: number;
      };
      return auto !== undefined && auto !== 0;
    },
  });

  const associate = async () => {
    if (!token || !account || !publicClient || accountOverride) return;
    setIsAssociating(true);
    setError(undefined);
    try {
      const hash =
        subject === "wallet"
          ? await writeContractAsync({
              address: token.address,
              abi: hrc719Abi,
              functionName: "associate",
              gas: ASSOCIATE_GAS,
              chainId: network.chainId,
            })
          : await writeContractAsync({
              address: helper as `0x${string}`,
              abi: swapHelperAbi,
              functionName: "associate",
              args: [token.address],
              gas: ASSOCIATE_GAS,
              chainId: network.chainId,
            });
      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      setError(getParsedError(e));
    } finally {
      setIsAssociating(false);
    }
  };

  return {
    /** True for native HBAR, which needs no association. Undefined while it is still being checked. */
    isAssociated: token?.isNative ? true : needsCheck ? isAssociated : undefined,
    isLoading: needsCheck && isLoading,
    isAssociating,
    error,
    associate,
  };
}

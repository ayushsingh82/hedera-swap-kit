import { usePools } from "./useSaucerSwapData";
import { useSwapHelper } from "./useSwapHelper";
import { useSwapNetwork } from "./useSwapNetwork";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { quoterV2Abi } from "~~/utils/swap/abis";
import { idToEvmAddress } from "~~/utils/swap/config";
import { splitFee } from "~~/utils/swap/math";
import type { PayoutRow } from "~~/utils/swap/payouts";
import { SwapRoute, encodePath, findRoute } from "~~/utils/swap/route";

export type PayoutCheck =
  | { status: "invalid" }
  | { status: "ready"; amountOut: bigint; route?: SwapRoute }
  | { status: "no-route" | "not-associated" | "no-quote" | "no-account" };

/**
 * Checks each payout before it is sent: a route with liquidity, a quote, and that the recipient is associated with
 * the token. Rows are checked together and the result lines up with `rows`. Every recipient must already have a
 * Hedera account: paying one that does not exist aborts the whole batch, not just that payment.
 */
export function usePayoutChecks(rows: PayoutRow[]) {
  const network = useSwapNetwork();
  const publicClient = usePublicClient({ chainId: network.chainId });
  const { swapPools } = usePools();
  const { feeBps } = useSwapHelper();

  const signature = rows.map(r => `${r.recipient}:${r.amountIn}:${r.token?.id}:${r.error ?? ""}`).join("|");

  return useQuery({
    queryKey: ["payouts", "checks", network.chainId, signature, swapPools.length, feeBps],
    enabled: rows.length > 0 && !!publicClient && swapPools.length > 0,
    staleTime: 15_000,
    queryFn: async (): Promise<PayoutCheck[]> => {
      type Account = { max_automatic_token_associations?: number } | null;
      const accounts = new Map<string, Promise<Account>>();
      const getAccount = (account: string) => {
        if (!accounts.has(account)) {
          accounts.set(
            account,
            fetch(`${network.mirrorNode}/api/v1/accounts/${account}`).then(async res => {
              if (res.status === 404) return null;
              if (!res.ok) throw new Error(`Mirror node request failed (${res.status})`);
              return (await res.json()) as Account;
            }),
          );
        }
        return accounts.get(account)!;
      };
      const associated = new Map<string, Promise<boolean>>();
      const isAssociated = (account: string, tokenId: string) => {
        const key = `${account}:${tokenId}`;
        if (!associated.has(key)) {
          associated.set(
            key,
            fetch(`${network.mirrorNode}/api/v1/accounts/${account}/tokens?token.id=${tokenId}`).then(async res => {
              if (res.status === 404) return false;
              if (!res.ok) throw new Error(`Mirror node request failed (${res.status})`);
              return ((await res.json()) as { tokens: unknown[] }).tokens.length > 0;
            }),
          );
        }
        return associated.get(key)!;
      };

      return Promise.all(
        rows.map(async (row): Promise<PayoutCheck> => {
          const { recipient, amountIn, token } = row;
          if (row.error || !recipient || !amountIn || !token) return { status: "invalid" };
          try {
            const account = await getAccount(recipient);
            if (!account) return { status: "no-account" };
            if (token.isNative) return { status: "ready", amountOut: amountIn };

            const route = findRoute(swapPools, network.whbarId, token.id, network.whbarId);
            if (!route) return { status: "no-route" };
            // Accounts that allow automatic associations (the default for new ones) receive the token on arrival.
            const autoAssociates = account.max_automatic_token_associations !== 0;
            if (!autoAssociates && !(await isAssociated(recipient, token.id))) return { status: "not-associated" };
            const { result } = await publicClient!.simulateContract({
              address: network.quoterV2,
              abi: quoterV2Abi,
              functionName: "quoteExactInput",
              args: [encodePath(route.tokens.map(idToEvmAddress), route.fees), splitFee(amountIn, feeBps).net],
            });
            return { status: "ready", amountOut: result[0], route };
          } catch {
            return { status: "no-quote" };
          }
        }),
      );
    },
  });
}

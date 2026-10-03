import { encodePacked } from "viem";

/** The slice of a SaucerSwap V2 pool the router needs. */
export type SwapPool = {
  tokenA: string;
  tokenB: string;
  fee: number;
  liquidity: bigint;
};

export type SwapRoute = {
  /** Token IDs from input to output. A direct route has 2, a route through WHBAR has 3. */
  tokens: string[];
  /** Pool fee between each pair of tokens, in hundredths of a bip (3000 = 0.30%). */
  fees: number[];
};

type ApiPool = {
  tokenA: { id: string };
  tokenB: { id: string };
  fee: number;
  liquidity: string;
};

export const toSwapPools = (apiPools: ApiPool[]): SwapPool[] =>
  apiPools.map(p => ({ tokenA: p.tokenA.id, tokenB: p.tokenB.id, fee: p.fee, liquidity: BigInt(p.liquidity) }));

/** The pool for a pair with the most liquidity, ignoring empty pools. */
function bestPool(pools: SwapPool[], a: string, b: string): SwapPool | undefined {
  return pools
    .filter(p => p.liquidity > 0n && ((p.tokenA === a && p.tokenB === b) || (p.tokenA === b && p.tokenB === a)))
    .sort((x, y) => (x.liquidity === y.liquidity ? 0 : x.liquidity > y.liquidity ? -1 : 1))[0];
}

/**
 * Finds a route between two tokens: a direct pool, otherwise two hops through WHBAR.
 * Use WHBAR's id for native HBAR. Returns undefined when no route has liquidity.
 */
export function findRoute(
  pools: SwapPool[],
  tokenIn: string,
  tokenOut: string,
  whbarId: string,
): SwapRoute | undefined {
  if (tokenIn === tokenOut) return undefined;

  const direct = bestPool(pools, tokenIn, tokenOut);
  if (direct) return { tokens: [tokenIn, tokenOut], fees: [direct.fee] };

  if (tokenIn === whbarId || tokenOut === whbarId) return undefined;
  const first = bestPool(pools, tokenIn, whbarId);
  const second = bestPool(pools, whbarId, tokenOut);
  if (first && second) return { tokens: [tokenIn, whbarId, tokenOut], fees: [first.fee, second.fee] };

  return undefined;
}

/** SaucerSwap's packed path: token (20 bytes), fee (3 bytes), token, ... `addresses` are EVM addresses. */
export function encodePath(addresses: `0x${string}`[], fees: number[]): `0x${string}` {
  if (addresses.length < 2 || fees.length !== addresses.length - 1) throw new Error("Invalid route");
  const types: ("address" | "uint24")[] = ["address"];
  const values: (`0x${string}` | number)[] = [addresses[0]];
  fees.forEach((fee, i) => {
    types.push("uint24", "address");
    values.push(fee, addresses[i + 1]);
  });
  return encodePacked(types, values);
}

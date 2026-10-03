import { SwapNetwork, idToEvmAddress } from "./config";
import { zeroAddress } from "viem";

export type SwapToken = {
  /** Hedera token ID (0.0.N). "HBAR" for the native coin. */
  id: string;
  address: `0x${string}`;
  symbol: string;
  name: string;
  /** Token decimals. HBAR uses 8 (tinybar), the unit contracts and the router work in. */
  decimals: number;
  icon?: string | null;
  priceUsd?: number;
  isNative?: boolean;
};

export const HBAR: SwapToken = {
  id: "HBAR",
  address: zeroAddress,
  symbol: "HBAR",
  name: "Hedera",
  decimals: 8,
  icon: "https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.15058.png",
  isNative: true,
};

/** Shape returned by the SaucerSwap `/tokens` endpoint (only the fields used here). */
export type SaucerSwapApiToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string | null;
  priceUsd?: number;
  dueDiligenceComplete?: boolean | number;
  inV2Pools?: boolean;
};

export function fromApiToken(token: SaucerSwapApiToken): SwapToken {
  return {
    id: token.id,
    address: idToEvmAddress(token.id),
    symbol: token.symbol.trim(),
    name: token.name.trim(),
    decimals: token.decimals,
    icon: token.icon,
    priceUsd: token.priceUsd,
  };
}

/** HBAR first, then vetted tokens, then the rest by symbol. Only tokens with a V2 pool can be swapped. */
export function buildTokenList(apiTokens: SaucerSwapApiToken[], network: SwapNetwork): SwapToken[] {
  const tokens = apiTokens
    .filter(t => t.inV2Pools && t.id !== network.whbarId)
    .sort(
      (a, b) => Number(!!b.dueDiligenceComplete) - Number(!!a.dueDiligenceComplete) || a.symbol.localeCompare(b.symbol),
    )
    .map(fromApiToken);
  const whbar = apiTokens.find(t => t.id === network.whbarId);
  return [{ ...HBAR, priceUsd: whbar?.priceUsd }, ...tokens];
}

/** The id a swap path uses for a token: native HBAR is swapped through WHBAR. */
export const pathId = (token: SwapToken, network: SwapNetwork) => (token.isNative ? network.whbarId : token.id);

import { getSwapNetwork, idToEvmAddress } from "./config";
import { parseSwapLogs } from "./history";
import { applySlippage, formatAmount, parseAmount, priceImpactPercent, splitFee } from "./math";
import { SwapPool, encodePath, findRoute } from "./route";
import { HBAR, SaucerSwapApiToken, buildTokenList, pathId } from "./tokens";
import { describe, expect, it } from "vitest";

const WHBAR = "0.0.15058";
const SAUCE = "0.0.1183558";
const USDC = "0.0.5449";
const DAI = "0.0.5529";

const pool = (tokenA: string, tokenB: string, fee: number, liquidity: bigint): SwapPool => ({
  tokenA,
  tokenB,
  fee,
  liquidity,
});

describe("config", () => {
  it("maps a Hedera id to a long-zero EVM address", () => {
    expect(idToEvmAddress("0.0.1414040")).toBe("0x0000000000000000000000000000000000159398");
    expect(idToEvmAddress("0.0.15058")).toBe("0x0000000000000000000000000000000000003ad2");
  });

  it("selects the network by chain id and falls back to testnet, including the local fork", () => {
    expect(getSwapNetwork(295).name).toBe("Hedera Mainnet");
    expect(getSwapNetwork(296).name).toBe("Hedera Testnet");
    expect(getSwapNetwork(31337).name).toBe("Hedera Testnet");
    expect(getSwapNetwork(undefined).chainId).toBe(296);
  });
});

describe("parseAmount", () => {
  it("parses decimals into the smallest unit", () => {
    expect(parseAmount("1.5", 8)).toBe(150_000_000n);
    expect(parseAmount("0.000001", 6)).toBe(1n);
    expect(parseAmount("12", 0)).toBe(12n);
    expect(parseAmount(".5", 2)).toBe(50n);
  });

  it("rejects empty, malformed and too precise input", () => {
    for (const bad of ["", " ", ".", "abc", "1.2.3", "-1", "1e5"]) expect(parseAmount(bad, 8)).toBeUndefined();
    expect(parseAmount("0.123", 2)).toBeUndefined();
  });
});

describe("formatAmount", () => {
  it("trims trailing zeros and caps fraction digits", () => {
    expect(formatAmount(150_000_000n, 8)).toBe("1.5");
    expect(formatAmount(100_000_000n, 8)).toBe("1");
    expect(formatAmount(123_456_789n, 8, 4)).toBe("1.2345");
    expect(formatAmount(1n, 8, 6)).toBe("0");
  });
});

describe("applySlippage", () => {
  it("lowers the minimum by the tolerance in basis points", () => {
    expect(applySlippage(1_000_000n, 50)).toBe(995_000n);
    expect(applySlippage(1_000_000n, 0)).toBe(1_000_000n);
    expect(applySlippage(1_000_000n, 10_000)).toBe(0n);
  });
});

describe("splitFee", () => {
  it("rounds the fee down like SwapHelper and keeps the rest", () => {
    expect(splitFee(1_000_000n, 100)).toEqual({ net: 990_000n, fee: 10_000n });
    expect(splitFee(99n, 100)).toEqual({ net: 99n, fee: 0n });
    expect(splitFee(500n, 0)).toEqual({ net: 500n, fee: 0n });
  });
});

describe("priceImpactPercent", () => {
  it("is zero when the executed rate equals the reference rate", () => {
    expect(priceImpactPercent(1000n, 2000n, 10n, 20n)).toBe(0);
  });

  it("measures how much worse the executed rate is", () => {
    expect(priceImpactPercent(1000n, 1800n, 10n, 20n)).toBe(10);
  });

  it("never goes negative and never divides by zero", () => {
    expect(priceImpactPercent(1000n, 2100n, 10n, 20n)).toBe(0);
    expect(priceImpactPercent(0n, 0n, 0n, 0n)).toBe(0);
    expect(priceImpactPercent(1000n, 1000n, 10n, 0n)).toBe(0);
  });
});

describe("findRoute", () => {
  it("uses the direct pool with the most liquidity", () => {
    const pools = [pool(WHBAR, SAUCE, 500, 10n), pool(SAUCE, WHBAR, 3000, 99n)];
    expect(findRoute(pools, WHBAR, SAUCE, WHBAR)).toEqual({ tokens: [WHBAR, SAUCE], fees: [3000] });
  });

  it("ignores pools without liquidity", () => {
    expect(findRoute([pool(WHBAR, SAUCE, 3000, 0n)], WHBAR, SAUCE, WHBAR)).toBeUndefined();
  });

  it("routes through WHBAR when there is no direct pool", () => {
    const pools = [pool(USDC, WHBAR, 3000, 5n), pool(WHBAR, SAUCE, 500, 5n)];
    expect(findRoute(pools, USDC, SAUCE, WHBAR)).toEqual({ tokens: [USDC, WHBAR, SAUCE], fees: [3000, 500] });
  });

  it("returns undefined when no route exists or both tokens match", () => {
    expect(findRoute([pool(USDC, DAI, 500, 5n)], USDC, SAUCE, WHBAR)).toBeUndefined();
    expect(findRoute([pool(USDC, DAI, 500, 5n)], USDC, USDC, WHBAR)).toBeUndefined();
  });
});

describe("encodePath", () => {
  it("packs addresses and fees as 20 and 3 byte segments", () => {
    const path = encodePath([idToEvmAddress(WHBAR), idToEvmAddress(SAUCE)], [3000]);
    expect(path).toBe(
      "0x0000000000000000000000000000000000003ad2" + "000bb8" + "0000000000000000000000000000000000120f46",
    );
    expect((path.length - 2) / 2).toBe(20 + 3 + 20);
  });

  it("rejects a mismatched fee count", () => {
    expect(() => encodePath([idToEvmAddress(WHBAR)], [])).toThrow("Invalid route");
    expect(() => encodePath([idToEvmAddress(WHBAR), idToEvmAddress(SAUCE)], [])).toThrow("Invalid route");
  });
});

describe("token list", () => {
  const api = (id: string, symbol: string, extra: Partial<SaucerSwapApiToken> = {}): SaucerSwapApiToken => ({
    id,
    symbol,
    name: symbol,
    decimals: 6,
    inV2Pools: true,
    ...extra,
  });
  const network = getSwapNetwork(296);

  it("puts HBAR first, hides WHBAR and tokens without a V2 pool, and ranks vetted tokens first", () => {
    const list = buildTokenList(
      [
        api("0.0.1", "ZED"),
        api(WHBAR, "HBAR", { priceUsd: 0.1 }),
        api(SAUCE, "SAUCE", { dueDiligenceComplete: true }),
        api("0.0.2", "NOPOOL", { inV2Pools: false }),
      ],
      network,
    );
    expect(list.map(t => t.symbol)).toEqual(["HBAR", "SAUCE", "ZED"]);
    expect(list[0].isNative).toBe(true);
    expect(list[0].priceUsd).toBe(0.1);
  });

  it("swaps native HBAR through WHBAR", () => {
    expect(pathId(HBAR, network)).toBe(network.whbarId);
    expect(pathId({ ...HBAR, id: SAUCE, isNative: false }, network)).toBe(SAUCE);
  });
});

describe("parseSwapLogs", () => {
  // A real Swapped event from Hedera testnet: 1 HBAR in, SAUCE out, no fee.
  const DEPLOYER = "0x4C33522F886A5c8c08e26d328b8D646A25501081";
  const swapLog = {
    data: "0x0000000000000000000000000000000000000000000000000000000000120f460000000000000000000000000000000000000000000000000000000005f5e100000000000000000000000000000000000000000000000000000000000261629b0000000000000000000000000000000000000000000000000000000000000000",
    topics: [
      "0xc007afccfb096c18134ad3ecc7e9ef71a52270d5ebfd6b168122e684a5baf12b",
      "0x0000000000000000000000004c33522f886a5c8c08e26d328b8d646a25501081",
      "0x0000000000000000000000004c33522f886a5c8c08e26d328b8d646a25501081",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
    transaction_hash: "0x1bd1c3480d29849e60e9f8abc79733b5fc713d1649a9edb118752ba08fd7b4f2",
    timestamp: "1790997861.715346012",
  };
  const otherEvent = { ...swapLog, topics: ["0xda6345b38e".padEnd(66, "0")] };

  it("decodes the account's swap", () => {
    const [swap] = parseSwapLogs([swapLog], DEPLOYER);
    expect(swap.hash).toBe(swapLog.transaction_hash);
    expect(swap.tokenIn).toBe("0x0000000000000000000000000000000000000000");
    expect(swap.amountIn).toBe(100_000_000n);
    expect(swap.fee).toBe(0n);
    expect(swap.timestamp.getTime()).toBe(1790997861 * 1000);
  });

  it("matches the account case-insensitively and skips other users and other events", () => {
    expect(parseSwapLogs([swapLog], DEPLOYER.toLowerCase())).toHaveLength(1);
    expect(parseSwapLogs([swapLog], "0x846Ff469eC6e8592ae71D9D52999b89534639B3A")).toHaveLength(0);
    expect(parseSwapLogs([otherEvent], DEPLOYER)).toHaveLength(0);
  });
});

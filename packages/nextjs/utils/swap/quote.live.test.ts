import { quoterV2Abi } from "./abis";
import { getSwapNetwork, idToEvmAddress } from "./config";
import { encodePath, findRoute, toSwapPools } from "./route";
import { createPublicClient, http } from "viem";
import { hederaTestnet } from "viem/chains";
import { describe, expect, it } from "vitest";

/**
 * Checks the swap logic against live Hedera testnet: real pools from SaucerSwap and a real QuoterV2 call.
 * Skipped by default so `npm test` works offline. Run with: LIVE=1 npm run next:test
 */
describe.skipIf(!process.env.LIVE)("live testnet quote", () => {
  const network = getSwapNetwork(296);

  it("finds a route for HBAR to SAUCE and gets a positive quote from QuoterV2", async () => {
    const response = await fetch(`${network.saucerApi}/v2/pools`);
    const pools = toSwapPools(await response.json());
    const route = findRoute(pools, network.whbarId, "0.0.1183558", network.whbarId);
    expect(route).toBeDefined();

    const client = createPublicClient({ chain: hederaTestnet, transport: http("https://testnet.hashio.io/api") });
    const path = encodePath(route!.tokens.map(idToEvmAddress), route!.fees);
    const { result } = await client.simulateContract({
      address: network.quoterV2,
      abi: quoterV2Abi,
      functionName: "quoteExactInput",
      args: [path, 100_000_000n],
    });
    expect(result[0]).toBeGreaterThan(0n);
  }, 30_000);
});

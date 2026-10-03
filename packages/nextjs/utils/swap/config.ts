/**
 * Per-network SaucerSwap and Hedera endpoints. Every contract and token ID was checked on the mirror node.
 * Hedera IDs (0.0.N) map to a "long-zero" EVM address: N as 20 big-endian bytes.
 * The local fork mirrors testnet, so it reuses the testnet entry.
 */
export type SwapNetwork = {
  chainId: number;
  name: string;
  swapRouter: `0x${string}`;
  quoterV2: `0x${string}`;
  /** The WHBAR *token* (not the WHBAR contract). It is the HBAR end of every swap path. */
  whbarId: string;
  saucerApi: string;
  mirrorNode: string;
  hashscan: string;
};

export function idToEvmAddress(id: string): `0x${string}` {
  const num = BigInt(id.split(".")[2]);
  return `0x${num.toString(16).padStart(40, "0")}`;
}

const testnet: SwapNetwork = {
  chainId: 296,
  name: "Hedera Testnet",
  swapRouter: idToEvmAddress("0.0.1414040"),
  quoterV2: idToEvmAddress("0.0.1390002"),
  whbarId: "0.0.15058",
  saucerApi: "https://test-api.saucerswap.finance",
  mirrorNode: "https://testnet.mirrornode.hedera.com",
  hashscan: "https://hashscan.io/testnet",
};

const mainnet: SwapNetwork = {
  chainId: 295,
  name: "Hedera Mainnet",
  swapRouter: idToEvmAddress("0.0.3949434"),
  quoterV2: idToEvmAddress("0.0.3949424"),
  whbarId: "0.0.1456986",
  saucerApi: "https://api.saucerswap.finance",
  mirrorNode: "https://mainnet.mirrornode.hedera.com",
  hashscan: "https://hashscan.io/mainnet",
};

const networks: Record<number, SwapNetwork> = {
  [testnet.chainId]: testnet,
  [mainnet.chainId]: mainnet,
};

export function getSwapNetwork(chainId: number | undefined): SwapNetwork {
  return (chainId !== undefined && networks[chainId]) || testnet;
}

export const hashscanTx = (network: SwapNetwork, hash: string) => `${network.hashscan}/transaction/${hash}`;

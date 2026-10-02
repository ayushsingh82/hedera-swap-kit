/**
 * SaucerSwap V2 deployments. Source: https://docs.saucerswap.finance/developers/contracts
 * Every ID below was checked against the public mirror node.
 *
 * Hedera contract and token IDs (0.0.N) map to a "long-zero" EVM address: N as 20 big-endian bytes.
 */
export interface SaucerSwapDeployment {
  swapRouter: string;
  quoterV2: string;
  /** The WHBAR *token* (not the WHBAR contract). It is the HBAR end of every swap path. */
  whbarToken: string;
}

export function idToEvmAddress(id: string): string {
  const num = BigInt(id.split(".")[2]);
  return "0x" + num.toString(16).padStart(40, "0");
}

const testnet: SaucerSwapDeployment = {
  swapRouter: idToEvmAddress("0.0.1414040"),
  quoterV2: idToEvmAddress("0.0.1390002"),
  whbarToken: idToEvmAddress("0.0.15058"),
};

const mainnet: SaucerSwapDeployment = {
  swapRouter: idToEvmAddress("0.0.3949434"),
  quoterV2: idToEvmAddress("0.0.3949424"),
  whbarToken: idToEvmAddress("0.0.1456986"),
};

/** Hardhat network names to deployments. The local forked node mirrors testnet. */
const deployments: Record<string, SaucerSwapDeployment> = {
  hardhat: testnet,
  localhost: testnet,
  hederaTestnet: testnet,
  hederaMainnet: mainnet,
};

export function getSaucerSwapDeployment(networkName: string): SaucerSwapDeployment {
  const deployment = deployments[networkName];
  if (!deployment) throw new Error(`No SaucerSwap deployment configured for network "${networkName}"`);
  return deployment;
}

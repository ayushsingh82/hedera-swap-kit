/**
 * Runs one real "pay in any token" transaction on Hedera testnet: HBAR is swapped to SAUCE and the SAUCE goes
 * straight to the receiver, the way a /pay checkout works. Prints a Hashscan link.
 *
 *   npm run demo:pay                      pays yourself
 *   DEMO_RECEIVER=0x... npm run demo:pay  pays someone else
 */
import { ethers, deployments, network } from "hardhat";

import { getSaucerSwapDeployment } from "../utils/saucerswap";

const SAUCE = "0x" + BigInt(1183558).toString(16).padStart(40, "0"); // 0.0.1183558
const POOL_FEE = 3000;
const PAY_HBAR = "0.5";
const SLIPPAGE_BPS = 500n;
const QUOTER_ABI = [
  "function quoteExactInput(bytes path, uint256 amountIn) returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
];
const HRC719_ABI = ["function associate()", "function isAssociated() view returns (bool)"];

async function main() {
  if (network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");

  const [signer] = await ethers.getSigners();
  const receiver = process.env.DEMO_RECEIVER ?? signer.address;
  const { quoterV2, whbarToken } = getSaucerSwapDeployment(network.name);
  const helper = await ethers.getContractAt("SwapHelper", (await deployments.get("SwapHelper")).address);

  // Accounts with automatic associations need no step, but one that has none must associate before it can receive.
  if (receiver === signer.address) {
    const sauce = new ethers.Contract(SAUCE, HRC719_ABI, signer);
    if (!(await sauce.isAssociated())) await (await sauce.associate({ gasLimit: 1_000_000 })).wait();
  }

  const path = await helper.encodePath([whbarToken, SAUCE], [POOL_FEE]);
  const amountInTinybar = ethers.parseUnits(PAY_HBAR, 8);
  const quoter = new ethers.Contract(quoterV2, QUOTER_ABI, signer);
  const [quoted] = await quoter.quoteExactInput.staticCall(path, amountInTinybar);
  const minOut = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  console.log(`Payer:    ${signer.address}`);
  console.log(`Receiver: ${receiver}`);
  console.log(`Paying ${PAY_HBAR} HBAR, receiver gets about ${Number(quoted) / 1e6} SAUCE`);

  const { gasPrice } = await ethers.provider.getFeeData();
  const tx = await helper.swapExactHbarForTokens(path, receiver, minOut, Math.floor(Date.now() / 1000) + 600, {
    // Hedera JSON-RPC values are weibar (1e18 per HBAR), the contract sees tinybar (1e8 per HBAR).
    value: amountInTinybar * 10n ** 10n,
    gasLimit: 1_000_000,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: 0n,
  });
  const receipt = await tx.wait();

  console.log(`\nPayment confirmed in block ${receipt?.blockNumber}`);
  console.log(`Hashscan: https://hashscan.io/testnet/transaction/${tx.hash}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

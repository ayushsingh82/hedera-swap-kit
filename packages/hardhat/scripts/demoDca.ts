/**
 * Runs one real auto-buy on Hedera testnet: creates a 2-run plan that buys SAUCE every minute, then watches the
 * Hedera Schedule Service run it with no bot. Prints Hashscan links for the plan and for each scheduled run.
 *
 *   npm run demo:dca
 *
 * Needs about 6 HBAR: the swap budget, an automation fee per run, and the gas to schedule the first run.
 */
import { ethers, deployments, network } from "hardhat";

import { getSaucerSwapDeployment } from "../utils/saucerswap";

const SAUCE = "0x" + BigInt(1183558).toString(16).padStart(40, "0"); // 0.0.1183558
const POOL_FEE = 3000;
const AMOUNT_PER_RUN = ethers.parseUnits("0.1", 8); // tinybar
const RUNS = 2;
const INTERVAL_SECONDS = 60;
const SLIPPAGE_BPS = 1000n;
const WAIT_SECONDS = 360;
const QUOTER_ABI = [
  "function quoteExactInput(bytes path, uint256 amountIn) returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
];
const HRC719_ABI = ["function associate()", "function isAssociated() view returns (bool)"];

async function main() {
  if (network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");

  const [signer] = await ethers.getSigners();
  const { quoterV2, whbarToken } = getSaucerSwapDeployment(network.name);
  const helper = await ethers.getContractAt("SwapHelper", (await deployments.get("SwapHelper")).address);
  const dca = await ethers.getContractAt("ScheduledSwap", (await deployments.get("ScheduledSwap")).address, signer);

  const sauce = new ethers.Contract(SAUCE, HRC719_ABI, signer);
  if (!(await sauce.isAssociated())) await (await sauce.associate({ gasLimit: 1_000_000 })).wait();

  const path = await helper.encodePath([whbarToken, SAUCE], [POOL_FEE]);
  const quoter = new ethers.Contract(quoterV2, QUOTER_ABI, signer);
  const [quoted] = await quoter.quoteExactInput.staticCall(path, AMOUNT_PER_RUN);
  const minOut = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  const fee: bigint = await dca.automationFeePerRun();
  const total = (AMOUNT_PER_RUN + fee) * BigInt(RUNS); // tinybar
  console.log(`Account:  ${signer.address}`);
  console.log(`Plan: ${Number(AMOUNT_PER_RUN) / 1e8} HBAR into SAUCE every ${INTERVAL_SECONDS}s, ${RUNS} runs`);
  console.log(`Paying ${Number(total) / 1e8} HBAR (budget ${Number(AMOUNT_PER_RUN * BigInt(RUNS)) / 1e8} + fees)`);

  // On Hedera JSON-RPC the value is in weibar (1e18 per HBAR) while the contract sees tinybar (1e8 per HBAR).
  const { gasPrice } = await ethers.provider.getFeeData();
  const tx = await dca.create(path, signer.address, AMOUNT_PER_RUN, minOut, INTERVAL_SECONDS, RUNS, {
    value: total * 10n ** 10n,
    gasLimit: 2_500_000,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: 0n,
  });
  const receipt = await tx.wait();
  console.log(`\nPlan created in block ${receipt?.blockNumber}`);
  console.log(`Hashscan: https://hashscan.io/testnet/transaction/${tx.hash}`);

  const id = (await dca.nextPlanId()) - 1n;
  const seen = new Set<string>();
  for (let waited = 0; waited < WAIT_SECONDS; waited += 10) {
    await new Promise(resolve => setTimeout(resolve, 10_000));
    const plan = await dca.getPlan(id);
    if (plan.schedule !== ethers.ZeroAddress && !seen.has(plan.schedule)) {
      seen.add(plan.schedule);
      console.log(`Scheduled run: https://hashscan.io/testnet/schedule/0.0.${BigInt(plan.schedule)}`);
    }
    console.log(`t+${waited + 10}s runs done ${plan.runsDone}/${RUNS}, active ${plan.active}`);
    if (!plan.active && plan.runsLeft === 0n) break;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

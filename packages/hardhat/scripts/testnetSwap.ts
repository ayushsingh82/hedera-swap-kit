/**
 * Runs one real swap on Hedera testnet through the deployed SwapHelper and prints a Hashscan link.
 * HBAR -> SAUCE through the WHBAR/SAUCE 0.30% pool.
 *
 *   npm run hardhat:deploy -- --network hederaTestnet
 *   npm run hardhat:swap-testnet
 *
 * Needs a funded testnet account in packages/hardhat/.env (see .env.example).
 */
import { ethers, deployments, network } from "hardhat";

import { getSaucerSwapDeployment } from "../utils/saucerswap";

const SAUCE = "0x" + BigInt(1183558).toString(16).padStart(40, "0"); // 0.0.1183558
const POOL_FEE = 3000;
const SWAP_HBAR = "1"; // HBAR sent. On Hedera JSON-RPC 1 HBAR is 1e18 and the contract sees 1e8 tinybar.
const SLIPPAGE_BPS = 500n;
const TINYBAR_PER_HBAR = 100_000_000n;

const QUOTER_ABI = [
  "function quoteExactInput(bytes path, uint256 amountIn) returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
];
const HRC719_ABI = ["function associate()", "function isAssociated() view returns (bool)"];

async function main() {
  if (network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");

  const [signer] = await ethers.getSigners();
  const { quoterV2, whbarToken } = getSaucerSwapDeployment(network.name);
  const helperDeployment = await deployments.get("SwapHelper");
  const helper = await ethers.getContractAt("SwapHelper", helperDeployment.address);

  console.log(`Account:    ${signer.address}`);
  console.log(`SwapHelper: ${helperDeployment.address}`);

  // The recipient must be associated with the output token before it can receive it.
  const sauce = new ethers.Contract(SAUCE, HRC719_ABI, signer);
  if (!(await sauce.isAssociated())) {
    console.log("Associating the account with SAUCE...");
    await (await sauce.associate({ gasLimit: 800_000 })).wait();
  }

  const path = await helper.encodePath([whbarToken, SAUCE], [POOL_FEE]);
  const amountInTinybar = BigInt(SWAP_HBAR) * TINYBAR_PER_HBAR;

  const quoter = new ethers.Contract(quoterV2, QUOTER_ABI, signer);
  const [quoted] = await quoter.quoteExactInput.staticCall(path, amountInTinybar);
  const amountOutMinimum = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(`Quote: ${SWAP_HBAR} HBAR -> ${quoted} SAUCE units (min ${amountOutMinimum})`);

  const deadline = Math.floor(Date.now() / 1000) + 600;
  const tx = await helper.swapExactHbarForTokens(path, signer.address, amountOutMinimum, deadline, {
    value: ethers.parseEther(SWAP_HBAR),
    gasLimit: 1_500_000,
  });
  const receipt = await tx.wait();

  console.log(`\nSwap confirmed in block ${receipt?.blockNumber}`);
  console.log(`Hashscan: https://hashscan.io/testnet/transaction/${tx.hash}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

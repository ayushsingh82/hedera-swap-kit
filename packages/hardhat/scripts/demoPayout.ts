/**
 * Runs one real batch payout on Hedera testnet through BatchPayout and prints the Hashscan link.
 * Three payments from the sender: HBAR swapped to SAUCE for an associated account, a plain HBAR transfer, and one
 * to an account that cannot receive SAUCE, which fails and is refunded without blocking the others.
 *
 *   npm run demo:payout
 *
 * Uses the funded testnet account in packages/hardhat/.env. Set DEMO_KEY=0x... to send from another account.
 */
import { ethers, deployments, network } from "hardhat";

import { getSaucerSwapDeployment } from "../utils/saucerswap";

const SAUCE = "0x" + BigInt(1183558).toString(16).padStart(40, "0"); // 0.0.1183558
const POOL_FEE = 3000;
const TINYBAR_PER_HBAR = 100_000_000n;
const SLIPPAGE_BPS = 500n;

const QUOTER_ABI = [
  "function quoteExactInput(bytes path, uint256 amountIn) returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
];
const HRC719_ABI = ["function associate()", "function isAssociated() view returns (bool)"];

async function main() {
  if (network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");

  const key = process.env.DEMO_KEY;
  const signer = key ? new ethers.Wallet(key, ethers.provider) : (await ethers.getSigners())[0];
  const { quoterV2, whbarToken } = getSaucerSwapDeployment(network.name);
  const helper = await ethers.getContractAt("SwapHelper", (await deployments.get("SwapHelper")).address);
  const batch = await ethers.getContractAt("BatchPayout", (await deployments.get("BatchPayout")).address, signer);

  // The first payee must be associated with SAUCE to receive it.
  // The ScheduledSwap contract exists but has never held SAUCE. It gets associated automatically on arrival.
  // (An address with no account at all would abort the whole batch, so every recipient needs an account.)
  const newHolder = (await deployments.get("ScheduledSwap")).address;
  const payee = new ethers.Wallet(process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY!, ethers.provider);
  const sauce = new ethers.Contract(SAUCE, HRC719_ABI, payee);
  if (!(await sauce.isAssociated())) await (await sauce.associate({ gasLimit: 1_000_000 })).wait();

  const path = await helper.encodePath([whbarToken, SAUCE], [POOL_FEE]);
  const swapHbar = TINYBAR_PER_HBAR / 10n; // 0.1 HBAR

  const quoter = new ethers.Contract(quoterV2, QUOTER_ABI, signer);
  const [quoted] = await quoter.quoteExactInput.staticCall(path, swapHbar);
  const minOut = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  const payments = [
    { recipient: payee.address, amountIn: swapHbar, minOut, path },
    { recipient: newHolder, amountIn: swapHbar, minOut, path },
  ];
  const total = payments.reduce((sum, p) => sum + p.amountIn, 0n);
  const batchId = ethers.encodeBytes32String("demo payroll");
  const deadline = Math.floor(Date.now() / 1000) + 600;

  console.log(`Sender:      ${signer.address}`);
  console.log(`BatchPayout: ${await batch.getAddress()}`);
  console.log(`Paying ${payments.length} recipients, ${Number(total) / 1e8} HBAR in total`);

  // On Hedera JSON-RPC the value is in weibar (1e18 per HBAR) while the contract sees tinybar (1e8 per HBAR).
  const value = total * 10n ** 10n;
  // The account must hold the gas limit times the max fee up front. ethers defaults the max fee to twice the gas
  // price, which doubles that reserve, so cap it at the gas price. Size the gas limit from an estimate.
  const { gasPrice } = await ethers.provider.getFeeData();
  const estimate = await batch.payout.estimateGas(payments, batchId, deadline, { value });
  const tx = await batch.payout(payments, batchId, deadline, {
    value,
    gasLimit: (estimate * 110n) / 100n,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: 0n,
  });
  const receipt = await tx.wait();

  const done = receipt!.logs
    .map(log => {
      try {
        return batch.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(parsed => parsed && parsed.name === "BatchCompleted")[0];
  console.log(
    `\nBatch confirmed in block ${receipt?.blockNumber}: sent ${done?.args.sent}, failed ${done?.args.failed}`,
  );
  console.log(`Hashscan: https://hashscan.io/testnet/transaction/${tx.hash}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

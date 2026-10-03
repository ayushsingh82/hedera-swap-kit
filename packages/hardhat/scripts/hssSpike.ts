/** Spike: deploy HssSpike on testnet, start 3 runs 30 seconds apart, and watch the network call tick() by itself. */
import { ethers, network } from "hardhat";

const TICK_GAS = BigInt(process.env.TICK_GAS ?? 2_000_000);
const FUND_HBAR = process.env.FUND_HBAR ?? "3";
const RUNS = Number(process.env.RUNS ?? 2);

async function main() {
  if (network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  // SPIKE_SIGNER_KEY lets a second funded wallet send start(), since the gas limit must be covered up front.
  const signerKey = process.env.SPIKE_SIGNER_KEY;
  const signer = signerKey ? new ethers.Wallet(signerKey, ethers.provider) : (await ethers.getSigners())[0];
  console.log("Account:", signer.address);

  // Reuse a deployed spike with SPIKE_ADDRESS=0x..., otherwise deploy and fund a new one.
  const existing = process.env.SPIKE_ADDRESS;
  const spike = existing
    ? await ethers.getContractAt("HssSpike", existing, signer)
    : await (
        await ethers.getContractFactory("HssSpike", signer)
      ).deploy(TICK_GAS, { value: ethers.parseEther(FUND_HBAR), gasLimit: 1_000_000 });
  await spike.waitForDeployment();
  console.log("HssSpike:", await spike.getAddress());

  const tx = await spike.start(30, RUNS, { gasLimit: Number(process.env.START_GAS ?? 2_500_000) });
  const receipt = await tx.wait();
  console.log("start() status", receipt?.status, `https://hashscan.io/testnet/transaction/${tx.hash}`);

  for (let i = 0; i < 14; i++) {
    await new Promise(r => setTimeout(r, 10_000));
    const ticks = await spike.ticks();
    console.log(`t+${(i + 1) * 10}s ticks=${ticks} runsLeft=${await spike.runsLeft()}`);
    if (ticks >= BigInt(RUNS)) break;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

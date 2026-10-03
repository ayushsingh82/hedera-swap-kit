import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

/**
 * Amounts the contract sees on Hedera are in tinybar (1 HBAR = 100,000,000).
 * Measured on testnet: a run that schedules the next one uses about 1.4M gas, and the contract must hold the gas
 * limit times the gas price when a run executes (84 tinybar per gas). The final run only swaps and needs far less.
 */
const TICK_GAS = 2_000_000;
const LAST_TICK_GAS = 800_000;
const AUTOMATION_FEE_PER_RUN = 130_000_000; // 1.3 HBAR

const deployScheduledSwap: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const swapHelper = await get("SwapHelper");

  await deploy("ScheduledSwap", {
    from: deployer,
    args: [swapHelper.address, deployer, TICK_GAS, LAST_TICK_GAS, AUTOMATION_FEE_PER_RUN],
    log: true,
    autoMine: true,
    gasLimit: "2000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deployScheduledSwap.tags = ["ScheduledSwap"];
deployScheduledSwap.dependencies = ["SwapHelper"];
export default deployScheduledSwap;

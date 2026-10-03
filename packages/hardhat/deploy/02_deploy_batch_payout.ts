import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const deployBatchPayout: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const swapHelper = await get("SwapHelper");

  await deploy("BatchPayout", {
    from: deployer,
    args: [swapHelper.address],
    log: true,
    autoMine: true,
    gasLimit: "750000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deployBatchPayout.tags = ["BatchPayout"];
deployBatchPayout.dependencies = ["SwapHelper"];
export default deployBatchPayout;

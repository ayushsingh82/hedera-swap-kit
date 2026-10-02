import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";
import { getSaucerSwapDeployment } from "../utils/saucerswap";

const deploySwapHelper: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { swapRouter, whbarToken } = getSaucerSwapDeployment(hre.network.name);

  await deploy("SwapHelper", {
    from: deployer,
    args: [swapRouter, whbarToken],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deploySwapHelper.tags = ["SwapHelper"];
export default deploySwapHelper;

"use client";

import type { NextPage } from "next";
import { SwapWidget } from "~~/components/swap";
import { useSwapHelper, useSwapNetwork } from "~~/hooks/swap";

const SwapPage: NextPage = () => {
  const network = useSwapNetwork();
  const { isDeployed, isLoading } = useSwapHelper();

  return (
    <div className="flex grow flex-col items-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Swap on {network.name}</h1>
        <p className="mt-1 text-sm opacity-70">Powered by SaucerSwap V2 through the SwapHelper contract</p>
      </div>

      {!isLoading && !isDeployed && (
        <div role="alert" className="alert alert-warning max-w-md text-sm">
          <span>
            SwapHelper is not deployed on {network.name} yet. Run{" "}
            <code className="font-mono">npm run hardhat:deploy -- --network hederaTestnet</code> to deploy it, then
            reload.
          </span>
        </div>
      )}

      <SwapWidget />
    </div>
  );
};

export default SwapPage;

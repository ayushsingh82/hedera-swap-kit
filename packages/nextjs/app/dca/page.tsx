"use client";

import type { NextPage } from "next";
import { DcaForm } from "~~/components/use-cases/DcaForm";
import { DcaPlans } from "~~/components/use-cases/DcaPlans";
import { useScheduledSwap, useSwapNetwork } from "~~/hooks/swap";

const DcaPage: NextPage = () => {
  const network = useSwapNetwork();
  const { isDeployed, isLoading } = useScheduledSwap();

  return (
    <div className="mx-auto flex w-full max-w-5xl grow flex-col items-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Auto-buy on {network.name}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-70">
          Buy a token on a schedule. The Hedera Schedule Service runs every purchase by itself, so there is no bot and
          nothing to keep online. Each run schedules the next.
        </p>
      </div>

      {!isLoading && !isDeployed && (
        <div role="alert" className="alert alert-warning max-w-md text-sm">
          <span>
            ScheduledSwap is not deployed on {network.name} yet. Run{" "}
            <code className="font-mono">npm run hardhat:deploy -- --network hederaTestnet</code>, then reload.
          </span>
        </div>
      )}

      <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex justify-center">
          <DcaForm />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Your auto-buys</h2>
          <DcaPlans />
        </div>
      </div>
    </div>
  );
};

export default DcaPage;

"use client";

import type { NextPage } from "next";
import { PayoutsForm } from "~~/components/use-cases/PayoutsForm";
import { useBatchPayout, useSwapNetwork } from "~~/hooks/swap";

const PayoutsPage: NextPage = () => {
  const network = useSwapNetwork();
  const { isDeployed, isLoading } = useBatchPayout();

  return (
    <div className="mx-auto flex w-full max-w-6xl grow flex-col items-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Payouts on {network.name}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm opacity-70">
          Pay many people in one transaction, each in the token they want. You fund the batch with HBAR, the kit swaps
          for each recipient, and a payment that fails is refunded instead of blocking the rest.
        </p>
      </div>

      {!isLoading && !isDeployed && (
        <div role="alert" className="alert alert-warning max-w-md text-sm">
          <span>
            BatchPayout is not deployed on {network.name} yet. Run{" "}
            <code className="font-mono">npm run hardhat:deploy -- --network hederaTestnet</code>, then reload.
          </span>
        </div>
      )}

      <PayoutsForm />
    </div>
  );
};

export default PayoutsPage;

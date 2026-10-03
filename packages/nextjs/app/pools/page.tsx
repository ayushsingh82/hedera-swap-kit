"use client";

import type { NextPage } from "next";
import { PoolsTable } from "~~/components/swap";
import { useSwapNetwork } from "~~/hooks/swap";

const PoolsPage: NextPage = () => {
  const network = useSwapNetwork();

  return (
    <div className="mx-auto w-full max-w-4xl grow px-4 py-10">
      <h1 className="text-3xl font-bold">Pools</h1>
      <p className="mb-6 mt-1 text-sm opacity-70">
        SaucerSwap V2 pools on {network.name}, ordered by TVL. Swaps route through the pool with the most liquidity.
      </p>
      <div className="rounded-2xl border border-base-300 bg-base-100 p-2">
        <PoolsTable />
      </div>
    </div>
  );
};

export default PoolsPage;

"use client";

import type { NextPage } from "next";
import { SwapHistory } from "~~/components/swap";

const HistoryPage: NextPage = () => (
  <div className="mx-auto w-full max-w-2xl grow px-4 py-10">
    <h1 className="text-3xl font-bold">Swap history</h1>
    <p className="mb-6 mt-1 text-sm opacity-70">
      Your recent swaps through SwapHelper, read from the Hedera mirror node.
    </p>
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <SwapHistory />
    </div>
  </div>
);

export default HistoryPage;

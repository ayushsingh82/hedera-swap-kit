"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { SwapWidget } from "~~/components/swap";
import { useSwapNetwork } from "~~/hooks/swap";

/** The token to sell: ?token=0.0.1183558 (or a symbol), else NEXT_PUBLIC_BUY_TOKEN, else SAUCE. */
const BuyToken = () => {
  const network = useSwapNetwork();
  const token = useSearchParams().get("token") ?? process.env.NEXT_PUBLIC_BUY_TOKEN ?? "SAUCE";

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Buy {token}</h1>
        <p className="mt-1 text-sm opacity-70">
          Pay with HBAR or any token on {network.name}. The tokens arrive in your wallet.
        </p>
      </div>
      <SwapWidget title="Buy" defaultTokenOut={token} lockTokenOut buttonLabel="Buy" />
    </>
  );
};

const BuyPage: NextPage = () => (
  <div className="flex grow flex-col items-center gap-6 px-4 py-10">
    <Suspense fallback={<span className="loading loading-spinner" />}>
      <BuyToken />
    </Suspense>
    <p className="max-w-md text-center text-xs opacity-60">
      Embed this for your own token: link to <code className="font-mono">/buy?token=0.0.YOUR_TOKEN</code> or set{" "}
      <code className="font-mono">NEXT_PUBLIC_BUY_TOKEN</code>.
    </p>
  </div>
);

export default BuyPage;

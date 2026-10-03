"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { SwapWidget } from "~~/components/swap";
import { PaymentLinkBuilder } from "~~/components/use-cases/PaymentLinkBuilder";

/** With ?to= it is a checkout: the buyer pays in any token and the receiver gets the requested token. */
const PayContent = () => {
  const params = useSearchParams();
  const to = params.get("to");
  const token = params.get("token") ?? "HBAR";
  const label = params.get("label");
  const order = params.get("order");

  if (!to) return <PaymentLinkBuilder />;
  if (!isAddress(to)) {
    return (
      <p role="alert" className="alert alert-error max-w-md text-sm">
        This payment link has an invalid receiver address.
      </p>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Pay {label ?? "the merchant"}</h1>
        {order && <p className="mt-1 text-sm opacity-70">Order {order}</p>}
        <p className="mt-1 break-all font-mono text-xs opacity-60">Receiver {to}</p>
      </div>
      <SwapWidget title="Pay" defaultTokenOut={token} lockTokenOut recipient={to} buttonLabel="Pay" />
      <Link href="/pay" className="link text-xs opacity-70">
        Create your own payment link
      </Link>
    </>
  );
};

const PayPage: NextPage = () => (
  <div className="flex grow flex-col items-center gap-6 px-4 py-10">
    <Suspense fallback={<span className="loading loading-spinner" />}>
      <PayContent />
    </Suspense>
  </div>
);

export default PayPage;
